// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.feedback

import android.content.Context
import android.os.Build
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import com.finance.core.haptics.HapticFeedback
import com.finance.core.haptics.HapticFeedbackDispatcher
import com.finance.core.haptics.HapticFeedbackEffect
import com.finance.core.haptics.HapticFeedbackSettings

/** Checks whether the current Android device exposes a haptic actuator. */
fun interface HapticAvailabilityChecker {
    /** Returns true when haptic hardware is available. */
    fun isHapticFeedbackAvailable(): Boolean
}

/** Android implementation of [HapticAvailabilityChecker]. */
class DefaultHapticAvailabilityChecker(private val context: Context) : HapticAvailabilityChecker {
    override fun isHapticFeedbackAvailable(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val manager = context.getSystemService(VibratorManager::class.java)
            manager?.defaultVibrator?.hasVibrator() == true
        } else {
            @Suppress("DEPRECATION")
            val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            @Suppress("DEPRECATION")
            vibrator?.hasVibrator() == true
        }
    }
}

/** Android [HapticFeedback] bridge backed by [View.performHapticFeedback]. */
class AndroidHapticFeedback(private val view: View) : HapticFeedback {
    override fun perform(effect: HapticFeedbackEffect) {
        if (isReduceMotionEnabled()) return
        val constant = when (effect) {
            HapticFeedbackEffect.TRANSACTION_SAVE_SUCCESS -> confirmConstant()
            HapticFeedbackEffect.TRANSACTION_VALIDATION_WARNING -> warningConstant()
        }
        view.performHapticFeedback(constant)
    }

    private fun confirmConstant(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        HapticFeedbackConstants.CONFIRM
    } else {
        HapticFeedbackConstants.KEYBOARD_TAP
    }

    private fun warningConstant(): Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        HapticFeedbackConstants.REJECT
    } else {
        HapticFeedbackConstants.KEYBOARD_TAP
    }

    private fun isReduceMotionEnabled(): Boolean {
        return Settings.Global.getFloat(
            view.context.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        ) == 0f
    }
}

/** Remembers a transaction-save haptic dispatcher for Compose screens. */
@Composable
fun rememberTransactionHapticFeedback(
    appHapticsEnabled: Boolean,
    deviceSupportsHaptics: Boolean,
): HapticFeedbackDispatcher {
    val view = LocalView.current
    return remember(view, appHapticsEnabled, deviceSupportsHaptics) {
        HapticFeedbackDispatcher(
            feedback = AndroidHapticFeedback(view),
            settingsProvider = {
                HapticFeedbackSettings(
                    deviceSupportsHaptics = deviceSupportsHaptics,
                    appHapticsEnabled = appHapticsEnabled,
                )
            },
        )
    }
}

/** Returns whether the current device supports haptics. */
@Composable
fun rememberHapticFeedbackAvailable(): Boolean {
    val context = LocalContext.current
    return remember(context) { DefaultHapticAvailabilityChecker(context).isHapticFeedbackAvailable() }
}
