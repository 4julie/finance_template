// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.expertise

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue

/**
 * Adaptive UI wrapper that conditionally renders content based on the
 * user's expertise tier (#379).
 *
 * Place these composables around sections of your UI that should adapt
 * to the user's skill level.
 */

/**
 * Only renders [content] if the current tier matches [minimumTier] or above.
 *
 * Example usage:
 * ```
 * WhenExpertiseAtLeast(ExpertiseTier.INTERMEDIATE, tierManager) {
 *     DebtToIncomeRatioCard(...)
 * }
 * ```
 *
 * @param minimumTier The minimum tier required to see this content.
 * @param tierManager The [ExpertiseTierManager] providing the current tier.
 * @param content The composable to conditionally render.
 */
@Composable
fun WhenExpertiseAtLeast(
    minimumTier: ExpertiseTier,
    tierManager: ExpertiseTierManager,
    content: @Composable () -> Unit,
) {
    val currentTier by tierManager.currentTier.collectAsState()
    if (currentTier.ordinal >= minimumTier.ordinal) {
        content()
    }
}

/**
 * Renders different content based on the user's expertise tier.
 *
 * Example:
 * ```
 * AdaptiveByTier(tierManager,
 *     beginner = { SimpleBudgetCard() },
 *     intermediate = { DetailedBudgetCard() },
 *     advanced = { AdvancedBudgetAnalytics() },
 * )
 * ```
 *
 * @param tierManager The [ExpertiseTierManager] providing the current tier.
 * @param beginner Content for beginner users.
 * @param intermediate Content for intermediate users.
 * @param advanced Content for advanced users.
 */
@Composable
fun AdaptiveByTier(
    tierManager: ExpertiseTierManager,
    beginner: @Composable () -> Unit = {},
    intermediate: @Composable () -> Unit = beginner,
    advanced: @Composable () -> Unit = intermediate,
) {
    val currentTier by tierManager.currentTier.collectAsState()
    when (currentTier) {
        ExpertiseTier.BEGINNER -> beginner()
        ExpertiseTier.INTERMEDIATE -> intermediate()
        ExpertiseTier.ADVANCED -> advanced()
    }
}
