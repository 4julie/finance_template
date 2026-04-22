// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.expertise

/**
 * User expertise tier for adaptive UI (#379).
 *
 * Determines how much detail, jargon, and complexity the app surfaces.
 * Users can self-select their tier or let the app infer it from usage
 * patterns.
 *
 * @property displayName Human-readable tier name.
 * @property description Brief description of what this tier means.
 */
enum class ExpertiseTier(
    val displayName: String,
    val description: String,
) {
    /**
     * New to personal finance. Shows simplified views, extensive tooltips,
     * guided workflows, and avoids jargon.
     */
    BEGINNER(
        displayName = "Beginner",
        description = "New to personal finance — simplified views with helpful guidance",
    ),

    /**
     * Understands basic budgeting and saving. Shows standard detail
     * with optional tooltips.
     */
    INTERMEDIATE(
        displayName = "Intermediate",
        description = "Comfortable with budgeting basics — balanced detail level",
    ),

    /**
     * Experienced with financial planning. Shows full detail, advanced
     * metrics, and power-user features.
     */
    ADVANCED(
        displayName = "Advanced",
        description = "Experienced with finance — full detail and advanced features",
    ),
}

/**
 * Feature visibility rules per expertise tier (#379).
 *
 * Encapsulates which UI elements, metrics, and features are visible
 * at each tier level. This is a pure data model — no Android or
 * Compose dependencies.
 *
 * @property tier The expertise tier these rules apply to.
 * @property showDetailedMetrics Whether to show advanced metrics (debt-to-income, etc.).
 * @property showTooltipsByDefault Whether tooltips auto-show or require tap.
 * @property showAdvancedCharts Whether to show complex chart types (candlestick, etc.).
 * @property showSimplifiedLabels Whether to use simplified labels instead of technical terms.
 * @property maxBudgetCategories Suggested max categories to show without "show more".
 * @property showGuidedWorkflows Whether to show step-by-step guided flows.
 * @property showProjections Whether to show future projections and forecasts.
 */
data class TierFeatureConfig(
    val tier: ExpertiseTier,
    val showDetailedMetrics: Boolean,
    val showTooltipsByDefault: Boolean,
    val showAdvancedCharts: Boolean,
    val showSimplifiedLabels: Boolean,
    val maxBudgetCategories: Int,
    val showGuidedWorkflows: Boolean,
    val showProjections: Boolean,
)

/**
 * Resolves [TierFeatureConfig] for a given [ExpertiseTier].
 *
 * Pure function — no side effects, easily testable.
 */
object ExpertiseTierConfig {

    fun configFor(tier: ExpertiseTier): TierFeatureConfig = when (tier) {
        ExpertiseTier.BEGINNER -> TierFeatureConfig(
            tier = tier,
            showDetailedMetrics = false,
            showTooltipsByDefault = true,
            showAdvancedCharts = false,
            showSimplifiedLabels = true,
            maxBudgetCategories = 5,
            showGuidedWorkflows = true,
            showProjections = false,
        )
        ExpertiseTier.INTERMEDIATE -> TierFeatureConfig(
            tier = tier,
            showDetailedMetrics = true,
            showTooltipsByDefault = false,
            showAdvancedCharts = false,
            showSimplifiedLabels = false,
            maxBudgetCategories = 10,
            showGuidedWorkflows = false,
            showProjections = true,
        )
        ExpertiseTier.ADVANCED -> TierFeatureConfig(
            tier = tier,
            showDetailedMetrics = true,
            showTooltipsByDefault = false,
            showAdvancedCharts = true,
            showSimplifiedLabels = false,
            maxBudgetCategories = 20,
            showGuidedWorkflows = false,
            showProjections = true,
        )
    }
}
