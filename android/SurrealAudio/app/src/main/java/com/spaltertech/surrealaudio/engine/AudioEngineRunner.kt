package com.spaltertech.surrealaudio.engine

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import com.spaltertech.surrealaudio.dsp.SurrealDsp
import kotlin.math.max
import kotlin.math.min

/**
 * Shared real-time path used by both capture mode and file-import mode:
 * takes interleaved 16-bit stereo PCM, runs it through [SurrealDsp], and
 * plays the result. Both modes just differ in where the PCM comes from
 * (AudioRecord for capture, a decoded file for import) — everything past
 * "here is a block of samples" is identical, so it lives once, here.
 */
class AudioEngineRunner(sampleRate: Int) {
    val dsp = SurrealDsp(sampleRate.toDouble())

    private val track = AudioTrack.Builder()
        .setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
        )
        .setAudioFormat(
            AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(sampleRate)
                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
                .build()
        )
        .setTransferMode(AudioTrack.MODE_STREAM)
        .setBufferSizeInBytes(
            AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_STEREO,
                AudioFormat.ENCODING_PCM_16BIT,
            ) * 2
        )
        .build()

    fun start() = track.play()

    fun stop() {
        track.stop()
        track.release()
    }

    /** Processes one interleaved [L,R,L,R,...] PCM16 block in place and plays it. */
    fun processAndPlay(interleaved: ShortArray, frames: Int) {
        val left = FloatArray(frames)
        val right = FloatArray(frames)
        for (i in 0 until frames) {
            left[i] = interleaved[i * 2] / 32768f
            right[i] = interleaved[i * 2 + 1] / 32768f
        }

        dsp.processBlock(left, right)

        for (i in 0 until frames) {
            interleaved[i * 2] = (min(1f, max(-1f, left[i])) * 32767f).toInt().toShort()
            interleaved[i * 2 + 1] = (min(1f, max(-1f, right[i])) * 32767f).toInt().toShort()
        }
        track.write(interleaved, 0, frames * 2)
    }
}
