// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.haptics

/** Semantic haptic patterns shared by transaction-save UI surfaces. */
enum class HapticFeedbackEffect {
    /** Confirmation after a transaction is saved successfully. */
    TRANSACTION_SAVE_SUCCESS,

    /** Soft warning when transaction validation fails. */
    TRANSACTION_VALIDATION_WARNING,
}

/** Platform haptic feedback bridge. Implementations must honor OS-level haptic settings. */
fun interface HapticFeedback {
    /** Performs the platform mapping for [effect], or no-ops when unavailable. */
    fun perform(effect: HapticFeedbackEffect)
}

/** No-op feedback for visual-only surfaces such as Web and Windows. */
object NoOpHapticFeedback : HapticFeedback {
    override fun perform(effect: HapticFeedbackEffect) = Unit
}

/** App/device haptic preference snapshot used by [HapticFeedbackDispatcher]. */
data class HapticFeedbackSettings(
    val deviceSupportsHaptics: Boolean,
    val appHapticsEnabled: Boolean = deviceSupportsHaptics,
) {
    /** True when haptic feedback is both supported and enabled in app settings. */
    val canPerformHaptics: Boolean = deviceSupportsHaptics && appHapticsEnabled
}

/** Dispatches semantic haptic events only when the user's settings allow it. */
class HapticFeedbackDispatcher(
    private val feedback: HapticFeedback,
    private val settingsProvider: () -> HapticFeedbackSettings,
) {
    /** Emits the success haptic for a completed transaction save. */
    fun transactionSaved() {
        perform(HapticFeedbackEffect.TRANSACTION_SAVE_SUCCESS)
    }

    /** Emits the soft warning haptic for a transaction validation failure. */
    fun validationFailed() {
        perform(HapticFeedbackEffect.TRANSACTION_VALIDATION_WARNING)
    }

    private fun perform(effect: HapticFeedbackEffect) {
        if (settingsProvider().canPerformHaptics) {
            feedback.perform(effect)
        }
    }
}
