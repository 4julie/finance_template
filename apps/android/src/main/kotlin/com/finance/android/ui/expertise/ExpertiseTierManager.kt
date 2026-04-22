// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.expertise

import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber

/**
 * Manages persistence and retrieval of the user's expertise tier (#379).
 *
 * Stores the selected tier in SharedPreferences and exposes it as a
 * reactive [StateFlow] for Compose UI consumption.
 *
 * @param sharedPreferences The app's SharedPreferences instance.
 */
class ExpertiseTierManager(
    private val sharedPreferences: SharedPreferences,
) {

    private val _currentTier = MutableStateFlow(loadTier())
    val currentTier: StateFlow<ExpertiseTier> = _currentTier.asStateFlow()

    /**
     * The current [TierFeatureConfig] derived from the active tier.
     */
    val currentConfig: TierFeatureConfig
        get() = ExpertiseTierConfig.configFor(_currentTier.value)

    /**
     * Updates the user's expertise tier and persists it.
     */
    fun setTier(tier: ExpertiseTier) {
        sharedPreferences.edit()
            .putString(PREF_KEY_TIER, tier.name)
            .apply()
        _currentTier.value = tier
        Timber.d("Expertise tier updated to %s", tier.name)
    }

    private fun loadTier(): ExpertiseTier {
        val stored = sharedPreferences.getString(PREF_KEY_TIER, null)
        return if (stored != null) {
            try {
                ExpertiseTier.valueOf(stored)
            } catch (_: IllegalArgumentException) {
                Timber.w("Unknown expertise tier '%s', defaulting to BEGINNER", stored)
                ExpertiseTier.BEGINNER
            }
        } else {
            ExpertiseTier.BEGINNER
        }
    }

    companion object {
        private const val PREF_KEY_TIER = "expertise_tier"
    }
}
