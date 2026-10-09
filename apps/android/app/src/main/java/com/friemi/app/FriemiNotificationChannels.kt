package com.friemi.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Build

object FriemiNotificationChannels {
    const val CHANNEL_ID = "friemi_activity_updates"

    @JvmStatic
    fun ensureDefaultChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = NotificationChannel(
            CHANNEL_ID,
            context.getString(R.string.app_name),
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Friemi notifications"
            enableLights(true)
            lightColor = Color.rgb(54, 151, 88)
            setShowBadge(true)
        }
        manager.createNotificationChannel(channel)
    }
}
