package com.spaltertech.surrealaudio

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class SurrealAudioApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CAPTURE_CHANNEL_ID,
                getString(R.string.capture_notification_channel),
                NotificationManager.IMPORTANCE_LOW,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    companion object {
        const val CAPTURE_CHANNEL_ID = "surreal_audio_capture"
    }
}
