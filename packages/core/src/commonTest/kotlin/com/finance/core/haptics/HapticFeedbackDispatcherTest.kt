// SPDX-License-Identifier: BUSL-1.1

package com.finance.core.haptics

import kotlin.test.Test
import kotlin.test.assertEquals

class HapticFeedbackDispatcherTest {
    @Test
    fun `transaction save dispatches success effect when enabled`() {
        val recorder = RecordingHapticFeedback()
        val dispatcher = HapticFeedbackDispatcher(
            feedback = recorder,
            settingsProvider = { HapticFeedbackSettings(deviceSupportsHaptics = true) },
        )

        dispatcher.transactionSaved()

        assertEquals(listOf(HapticFeedbackEffect.TRANSACTION_SAVE_SUCCESS), recorder.effects)
    }

    @Test
    fun `validation failure dispatches warning effect when enabled`() {
        val recorder = RecordingHapticFeedback()
        val dispatcher = HapticFeedbackDispatcher(
            feedback = recorder,
            settingsProvider = { HapticFeedbackSettings(deviceSupportsHaptics = true) },
        )

        dispatcher.validationFailed()

        assertEquals(listOf(HapticFeedbackEffect.TRANSACTION_VALIDATION_WARNING), recorder.effects)
    }

    @Test
    fun `dispatcher no-ops when app toggle is disabled`() {
        val recorder = RecordingHapticFeedback()
        val dispatcher = HapticFeedbackDispatcher(
            feedback = recorder,
            settingsProvider = {
                HapticFeedbackSettings(
                    deviceSupportsHaptics = true,
                    appHapticsEnabled = false,
                )
            },
        )

        dispatcher.transactionSaved()
        dispatcher.validationFailed()

        assertEquals(emptyList(), recorder.effects)
    }

    @Test
    fun `dispatcher no-ops when device has no haptic support`() {
        val recorder = RecordingHapticFeedback()
        val dispatcher = HapticFeedbackDispatcher(
            feedback = recorder,
            settingsProvider = { HapticFeedbackSettings(deviceSupportsHaptics = false) },
        )

        dispatcher.transactionSaved()

        assertEquals(emptyList(), recorder.effects)
    }

    private class RecordingHapticFeedback : HapticFeedback {
        val effects = mutableListOf<HapticFeedbackEffect>()

        override fun perform(effect: HapticFeedbackEffect) {
            effects += effect
        }
    }
}
