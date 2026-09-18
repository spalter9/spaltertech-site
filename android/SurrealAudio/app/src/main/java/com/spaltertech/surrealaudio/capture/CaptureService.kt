package com.spaltertech.surrealaudio.capture

import android.app.Notification
import android.app.Service
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioPlaybackCaptureConfiguration
import android.media.AudioRecord
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Binder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.getSystemService
import com.spaltertech.surrealaudio.R
import com.spaltertech.surrealaudio.SurrealAudioApp
import com.spaltertech.surrealaudio.engine.AudioEngineRunner
import kotlin.concurrent.thread

/**
 * Captures other apps' media playback (Spotify, etc.) via Android's
 * AudioPlaybackCapture API (API 29+) and runs it through the Surreal Audio
 * engine in real time.
 *
 * Known platform limitation, not a bug in this code: AudioPlaybackCapture
 * is a read-only tap — the source app's audio keeps playing through the
 * speaker at the same time this service plays its processed copy back.
 * There is no public API to silence the source app's own output. The UI
 * tells the user to lower that app's own per-app volume (supported on
 * most Android 13+ phones under Settings > Sound > App volume) so only
 * the processed copy is audible. This mirrors the real constraint every
 * Android audio-effects app built on this API has to work within.
 */
class CaptureService : Service() {

    private val binder = LocalBinder()
    private var mediaProjection: MediaProjection? = null
    private var audioRecord: AudioRecord? = null
    private var engine: AudioEngineRunner? = null
    @Volatile private var running = false

    inner class LocalBinder : Binder() {
        fun getService(): CaptureService = this@CaptureService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, 0) ?: 0
        val resultData = intent?.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
        if (resultData != null) {
            startCapture(resultCode, resultData)
        }
        return START_NOT_STICKY
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, SurrealAudioApp.CAPTURE_CHANNEL_ID)
            .setContentTitle(getString(R.string.capture_notification_title))
            .setContentText(getString(R.string.capture_notification_text))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .build()

    private fun startCapture(resultCode: Int, resultData: Intent) {
        val projectionManager = getSystemService<MediaProjectionManager>()!!
        val projection = projectionManager.getMediaProjection(resultCode, resultData)
        mediaProjection = projection
        projection.registerCallback(object : MediaProjection.Callback() {
            override fun onStop() {
                stopCapture()
            }
        }, Handler(Looper.getMainLooper()))

        val sampleRate = 44100
        val config = AudioPlaybackCaptureConfiguration.Builder(projection)
            .addMatchingUsage(AudioAttributes.USAGE_MEDIA)
            .addMatchingUsage(AudioAttributes.USAGE_GAME)
            .addMatchingUsage(AudioAttributes.USAGE_UNKNOWN)
            .build()

        val format = AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(sampleRate)
            .setChannelMask(AudioFormat.CHANNEL_IN_STEREO)
            .build()

        val minBuf = AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_STEREO,
            AudioFormat.ENCODING_PCM_16BIT,
        )

        val record = AudioRecord.Builder()
            .setAudioFormat(format)
            .setBufferSizeInBytes(minBuf * 2)
            .setAudioPlaybackCaptureConfig(config)
            .build()
        audioRecord = record

        val runner = AudioEngineRunner(sampleRate)
        engine = runner

        running = true
        record.startRecording()
        runner.start()

        thread(name = "SurrealAudioCapture") {
            val blockFrames = 1024
            val buffer = ShortArray(blockFrames * 2)
            while (running) {
                val read = record.read(buffer, 0, buffer.size)
                if (read > 0) {
                    runner.processAndPlay(buffer, read / 2)
                }
            }
        }
    }

    /** true = Immersive engaged, false = pass-through dry. */
    fun setEngaged(engaged: Boolean) {
        engine?.dsp?.engaged = engaged
    }

    fun isEngaged(): Boolean = engine?.dsp?.engaged ?: false

    private fun stopCapture() {
        running = false
        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
        engine?.stop()
        engine = null
        mediaProjection?.stop()
        mediaProjection = null
    }

    override fun onDestroy() {
        stopCapture()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"
        private const val NOTIFICATION_ID = 1
    }
}
