// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import timber.log.Timber

/**
 * Creates Android notification channels for Finance notification types.
 *
 * Notification channels are required on Android 8.0+ (API 26+). Since our
 * minSdk is 28, channels are always required. Each [NotificationType] maps
 * to a separate channel so users can independently control each type
 * from Android system settings.
 *
 * Call [createChannels] once during app startup (e.g. from [FinanceApplication]).
 */
object NotificationChannelManager {

    /**
     * Creates notification channels for all [NotificationType]s.
     *
     * Safe to call multiple times — the system ignores duplicate channel creation.
     *
     * @param context Application context.
     */
    fun createChannels(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE)
            as NotificationManager

        NotificationType.entries.forEach { type ->
            val channel = NotificationChannel(
                type.channelId,
                type.channelName,
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply {
                description = type.description
                // Financial notifications should not vibrate by default —
                // the user can override in system settings if desired.
                enableVibration(false)
            }
            notificationManager.createNotificationChannel(channel)
        }

        Timber.d("Notification channels created: %s",
            NotificationType.entries.joinToString { it.channelId })
    }
}
