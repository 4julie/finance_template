// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.streak

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finance.android.auth.HouseholdIdProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import timber.log.Timber

/**
 * UI state for the streak tracking feature.
 *
 * All text is phrased positively and non-manipulatively:
 * - No "You're about to lose your streak!" messaging
 * - No fake urgency or loss-aversion tactics
 * - Celebration of presence, not punishment for absence
 */
data class StreakUiState(
    /** Current consecutive-day streak (0 = no active streak). */
    val currentStreak: Int = 0,

    /** Longest-ever streak achieved. */
    val longestStreak: Int = 0,

    /** A brief, encouraging, non-manipulative message. */
    val message: String = StreakCalculator.streakMessage(0),

    /** Whether streak data is still loading. */
    val isLoading: Boolean = true,

    /** Whether the user has opted in to seeing streak info. */
    val isVisible: Boolean = true,
)

/**
 * ViewModel for the logging consistency streak tracker.
 *
 * Observes transaction dates via [StreakRepository] and computes the
 * current and longest streaks using [StreakCalculator].
 *
 * The streak is purely informational — it does not gate features,
 * send notifications, or use manipulative language.
 *
 * @param streakRepository Source of distinct transaction logging dates.
 * @param householdIdProvider Provides the authenticated household ID.
 */
class StreakViewModel(
    private val streakRepository: StreakRepository,
    private val householdIdProvider: HouseholdIdProvider,
) : ViewModel() {

    private val _uiState = MutableStateFlow(StreakUiState())
    val uiState: StateFlow<StreakUiState> = _uiState.asStateFlow()

    init {
        observeStreak()
    }

    private fun observeStreak() {
        viewModelScope.launch {
            val householdId = householdIdProvider.householdId.value ?: run {
                Timber.d("No household ID available — streak tracking inactive")
                _uiState.update { it.copy(isLoading = false, currentStreak = 0) }
                return@launch
            }

            streakRepository.observeLoggingDates(householdId.value).collectLatest { dates ->
                val current = StreakCalculator.currentStreak(dates)
                val longest = StreakCalculator.longestStreak(dates)
                val message = StreakCalculator.streakMessage(current)

                Timber.d("Streak updated: current=%d, longest=%d", current, longest)

                _uiState.update {
                    it.copy(
                        currentStreak = current,
                        longestStreak = longest,
                        message = message,
                        isLoading = false,
                    )
                }
            }
        }
    }

    /**
     * Allows the user to dismiss the streak card. This is opt-in UI —
     * users who find streak tracking unhelpful can hide it without judgment.
     */
    fun dismissStreak() {
        _uiState.update { it.copy(isVisible = false) }
        Timber.d("User dismissed streak card")
    }
}
