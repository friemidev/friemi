package com.friemi.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FriemiFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        FriemiPushTokenProvider.saveLatestToken(this, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: message.data["text"]
            ?: return
        val url = message.data["url"]
            ?: message.data["deepLink"]
            ?: message.data["path"]
        val badgeCount = message.data["badgeCount"]?.toIntOrNull()
            ?: message.data["unreadCount"]?.toIntOrNull()
            ?: 0

        showNotification(title, body, url, badgeCount)
    }

    private fun showNotification(title: String, body: String, url: String?, badgeCount: Int) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "friemi_activity_updates"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Friemi",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = "Friemi notifications"
                enableLights(true)
                lightColor = Color.rgb(54, 151, 88)
                setShowBadge(true)
            }
            manager.createNotificationChannel(channel)
        }

        val targetUri = resolveTargetUri(url)
        val intent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = targetUri
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            targetUri.toString().hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, channelId)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }

        val notification = builder
            .setSmallIcon(R.drawable.ic_stat_friemi)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(Notification.BigTextStyle().bigText(body))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setNumber(badgeCount.coerceAtLeast(0))
            .apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    setBadgeIconType(Notification.BADGE_ICON_SMALL)
                }
            }
            .build()

        manager.notify(targetUri.toString().hashCode(), notification)
    }

    private fun resolveTargetUri(url: String?): Uri {
        if (url.isNullOrBlank()) {
            return Uri.parse("${BuildConfig.FRIEMI_BASE_URL}${BuildConfig.FRIEMI_DEFAULT_PATH}")
        }

        if (url.startsWith("friemi://", ignoreCase = true) || url.startsWith("https://", ignoreCase = true)) {
            return Uri.parse(url)
        }

        val normalizedPath = if (url.startsWith("/")) url else "/$url"
        return Uri.parse("${BuildConfig.FRIEMI_BASE_URL}$normalizedPath")
    }
}
