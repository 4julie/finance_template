// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.expertise

import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.StateFlow
import timber.log.Timber

/**
 * ViewModel for the expertise tier selection and adaptive UI (#379).
 *
 * Exposes the current tier and feature config as reactive state, and
 * provides methods to change the user's tier.
 *
 * @param expertiseTierManager Manages tier persistence and retrieval.
 */
class ExpertiseTierViewModel(
    private val expertiseTierManager: ExpertiseTierManager,
) : ViewModel() {

    /** The currently selected expertise tier. */
    val currentTier: StateFlow<ExpertiseTier> = expertiseTierManager.currentTier

    /** Available tiers for the tier selector UI. */
    val availableTiers: List<ExpertiseTier> = ExpertiseTier.entries

    /**
     * Returns the [TierFeatureConfig] for the current tier.
     */
    fun currentConfig(): TierFeatureConfig = expertiseTierManager.currentConfig

    /**
     * Updates the user's expertise tier.
     */
    fun selectTier(tier: ExpertiseTier) {
        Timber.d("User selected expertise tier: %s", tier.name)
        expertiseTierManager.setTier(tier)
    }
}
