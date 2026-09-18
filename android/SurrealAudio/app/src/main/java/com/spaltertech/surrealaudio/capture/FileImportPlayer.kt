package com.spaltertech.surrealaudio.capture

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import com.spaltertech.surrealaudio.engine.AudioEngineRunner
import java.nio.ByteBuffer
import kotlin.concurrent.thread

/**
 * "My Music" mode: decodes a file the user picked from their own library
 * and plays it back live through the Surreal Audio engine. No system
 * capture involved, so this mode needs no special permission beyond
 * reading the picked file — it's the one path the iOS app can share
 * unchanged, since Apple allows this but not app-to-app audio capture.
 */
class FileImportPlayer(private val context: Context) {

    @Volatile private var stopped = false
    private var engine: AudioEngineRunner? = null

    fun isEngaged(): Boolean = engine?.dsp?.engaged ?: false
    fun setEngaged(engaged: Boolean) {
        engine?.dsp?.engaged = engaged
    }

    fun stop() {
        stopped = true
    }

    /** Decodes and plays [uri] on a background thread until it ends or [stop] is called. */
    fun play(uri: Uri, onFinished: () -> Unit) {
        stopped = false
        thread(name = "SurrealAudioFileImport") {
            val extractor = MediaExtractor()
            extractor.setDataSource(context, uri, null)

            var audioTrackIndex = -1
            var format: MediaFormat? = null
            for (i in 0 until extractor.trackCount) {
                val f = extractor.getTrackFormat(i)
                val mime = f.getString(MediaFormat.KEY_MIME) ?: continue
                if (mime.startsWith("audio/")) {
                    audioTrackIndex = i
                    format = f
                    break
                }
            }
            if (audioTrackIndex < 0 || format == null) {
                extractor.release()
                onFinished()
                return@thread
            }
            extractor.selectTrack(audioTrackIndex)

            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val mime = format.getString(MediaFormat.KEY_MIME)!!

            val codec = MediaCodec.createDecoderByType(mime)
            codec.configure(format, null, null, 0)
            codec.start()

            val runner = AudioEngineRunner(sampleRate)
            engine = runner
            runner.start()

            val bufferInfo = MediaCodec.BufferInfo()
            var sawInputEnd = false
            var sawOutputEnd = false

            // Leftover mono-to-stereo / resample handling is intentionally
            // out of scope for this first pass: decoders on real devices
            // overwhelmingly hand back 44.1/48kHz stereo PCM for standard
            // music files, which is what AudioEngineRunner expects.
            while (!sawOutputEnd && !stopped) {
                if (!sawInputEnd) {
                    val inIndex = codec.dequeueInputBuffer(10_000)
                    if (inIndex >= 0) {
                        val inputBuffer: ByteBuffer = codec.getInputBuffer(inIndex)!!
                        val sampleSize = extractor.readSampleData(inputBuffer, 0)
                        if (sampleSize < 0) {
                            codec.queueInputBuffer(inIndex, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM)
                            sawInputEnd = true
                        } else {
                            codec.queueInputBuffer(inIndex, 0, sampleSize, extractor.sampleTime, 0)
                            extractor.advance()
                        }
                    }
                }

                val outIndex = codec.dequeueOutputBuffer(bufferInfo, 10_000)
                if (outIndex >= 0) {
                    val outputBuffer: ByteBuffer = codec.getOutputBuffer(outIndex)!!
                    val pcm = ShortArray(bufferInfo.size / 2)
                    outputBuffer.asShortBuffer().get(pcm)

                    if (channelCount == 2) {
                        runner.processAndPlay(pcm, pcm.size / 2)
                    } else {
                        // mono source: duplicate to stereo so the width
                        // engine has two channels to work with
                        val stereo = ShortArray(pcm.size * 2)
                        for (i in pcm.indices) {
                            stereo[i * 2] = pcm[i]
                            stereo[i * 2 + 1] = pcm[i]
                        }
                        runner.processAndPlay(stereo, pcm.size)
                    }

                    codec.releaseOutputBuffer(outIndex, false)
                    if (bufferInfo.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0) {
                        sawOutputEnd = true
                    }
                }
            }

            runner.stop()
            engine = null
            codec.stop()
            codec.release()
            extractor.release()
            onFinished()
        }
    }
}
