package com.friemi.app

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.util.TimeZone
import java.util.UUID

fun interface FriemiPushTokenCallback {
    fun onResult(payloadJson: String)
}

object FriemiPushTokenProvider {
    private const val PREFS_NAME = "friemi_android_push"
    private const val PREF_DEVICE_ID = "device_id"
    private const val PREF_LAST_FCM_TOKEN = "last_fcm_token"

    @JvmStatic
    fun requestToken(
        context: Context,
        locale: String,
        callback: FriemiPushTokenCallback,
    ) {
        if (FirebaseApp.getApps(context).isEmpty()) {
            callback.onResult(errorPayload("FIREBASE_NOT_CONFIGURED"))
            return
        }

        FirebaseMessaging.getInstance().token
            .addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    callback.onResult(errorPayload("TOKEN_UNAVAILABLE"))
                    return@addOnCompleteListener
                }

                val token = task.result
                if (token.isNullOrBlank()) {
                    callback.onResult(errorPayload("EMPTY_TOKEN"))
                    return@addOnCompleteListener
                }

                saveLatestToken(context, token)
                callback.onResult(successPayload(context, token, locale))
            }
    }

    @JvmStatic
    fun saveLatestToken(context: Context, token: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(PREF_LAST_FCM_TOKEN, token)
            .apply()
    }

    @JvmStatic
    fun getStoredTokenPayload(context: Context, locale: String): String {
        val token = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(PREF_LAST_FCM_TOKEN, null)

        if (token.isNullOrBlank()) {
            return errorPayload("TOKEN_NOT_CACHED")
        }

        return successPayload(context, token, locale)
    }

    @JvmStatic
    fun getDeviceId(context: Context): String {
        val preferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val existing = preferences.getString(PREF_DEVICE_ID, null)

        if (!existing.isNullOrBlank()) {
            return existing
        }

        val created = UUID.randomUUID().toString()
        preferences.edit().putString(PREF_DEVICE_ID, created).apply()
        return created
    }

    private fun successPayload(
        context: Context,
        token: String,
        locale: String,
    ): String {
        return JSONObject()
            .put("ok", true)
            .put("supported", true)
            .put("platform", "ANDROID")
            .put("fcmToken", token)
            .put("deviceId", getDeviceId(context))
            .put("appVersion", BuildConfig.VERSION_NAME)
            .put("locale", locale)
            .put("timezone", TimeZone.getDefault().id)
            .toString()
    }

    private fun errorPayload(reason: String): String {
        return JSONObject()
            .put("ok", false)
            .put("supported", false)
            .put("reason", reason)
            .toString()
    }
}
