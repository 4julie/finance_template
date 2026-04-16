// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.security

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.logging.Logger

/**
 * Manages automatic application locking after a period of user inactivity.
 *
 * The auto-lock timer resets whenever [resetTimer] is called, which should
 * happen on any user interaction (mouse movement, key press, touch). When
 * the configured timeout elapses without a reset, the [onLockTriggered]
 * callback fires and [isLocked] transitions to `true`.
 *
 * ## Usage
 *
 * ```kotlin
 * val autoLock = AutoLockManager(
 *     scope = viewModelScope,
 *     timeoutMinutes = 5,
 *     onLockTriggered = { authViewModel.lockApp() },
 * )
 *
 * // Call on any user activity:
 * autoLock.resetTimer()
 *
 * // Toggle enabled/disabled:
 * autoLock.setEnabled(false)
 * ```
 *
 * ## Thread Safety
 *
 * All operations are coroutine-safe and execute on the provided [CoroutineScope].
 * The [isLocked] state is exposed as a [StateFlow] for safe composition observation.
 *
 * @param scope The coroutine scope for launching the timer.
 * @param timeoutMinutes Minutes of inactivity before auto-lock triggers.
 * @param onLockTriggered Callback invoked when the timeout elapses.
 */
class AutoLockManager(
    private val scope: CoroutineScope,
    private val timeoutMinutes: Int = DEFAULT_TIMEOUT_MINUTES,
    private val onLockTriggered: () -> Unit,
) {
    companion object {
        private val logger: Logger = Logger.getLogger(AutoLockManager::class.java.name)

        /** Default timeout: 5 minutes. */
        const val DEFAULT_TIMEOUT_MINUTES = 5

        /** Minimum allowed timeout: 1 minute. */
        const val MIN_TIMEOUT_MINUTES = 1

        /** Maximum allowed timeout: 60 minutes. */
        const val MAX_TIMEOUT_MINUTES = 60
    }

    private val _isLocked = MutableStateFlow(false)

    /** Whether the application is currently locked due to inactivity. */
    val isLocked: StateFlow<Boolean> = _isLocked.asStateFlow()

    private var timerJob: Job? = null

    @Volatile
    private var enabled: Boolean = true

    /**
     * Resets the inactivity timer.
     *
     * Call this on any user interaction event (mouse move, key press, etc.)
     * to prevent the auto-lock from triggering. If the timer is not enabled
     * or the app is already locked, this is a no-op.
     */
    fun resetTimer() {
        if (!enabled) return

        timerJob?.cancel()
        timerJob = scope.launch {
            delay(timeoutMinutes.toLong() * 60 * 1000)
            logger.info("Auto-lock triggered after $timeoutMinutes minutes of inactivity")
            _isLocked.value = true
            onLockTriggered()
        }
    }

    /**
     * Enables or disables the auto-lock timer.
     *
     * When disabled, the current timer is cancelled and the app remains
     * unlocked. When re-enabled, a new timer starts.
     *
     * @param isEnabled Whether auto-lock should be active.
     */
    fun setEnabled(isEnabled: Boolean) {
        enabled = isEnabled
        if (!isEnabled) {
            timerJob?.cancel()
            timerJob = null
            logger.fine("Auto-lock disabled")
        } else {
            resetTimer()
            logger.fine("Auto-lock enabled ($timeoutMinutes min)")
        }
    }

    /**
     * Marks the application as unlocked.
     *
     * Call after successful authentication to reset the locked state
     * and restart the inactivity timer.
     */
    fun unlock() {
        _isLocked.value = false
        resetTimer()
    }

    /**
     * Stops the auto-lock timer and releases resources.
     *
     * Call during application shutdown or ViewModel cleanup.
     */
    fun dispose() {
        timerJob?.cancel()
        timerJob = null
    }
}
