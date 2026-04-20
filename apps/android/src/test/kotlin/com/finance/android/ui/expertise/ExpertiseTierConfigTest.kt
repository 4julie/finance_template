// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.expertise

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Unit tests for the expertise tier system (#379).
 *
 * Validates tier configurations, feature visibility rules, and
 * the progression logic between tiers.
 */
class ExpertiseTierConfigTest {

    // ── Beginner tier tests ─────────────────────────────────────────

    @Test
    fun `beginner tier hides detailed metrics`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertFalse(config.showDetailedMetrics)
    }

    @Test
    fun `beginner tier shows tooltips by default`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertTrue(config.showTooltipsByDefault)
    }

    @Test
    fun `beginner tier hides advanced charts`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertFalse(config.showAdvancedCharts)
    }

    @Test
    fun `beginner tier shows simplified labels`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertTrue(config.showSimplifiedLabels)
    }

    @Test
    fun `beginner tier shows guided workflows`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertTrue(config.showGuidedWorkflows)
    }

    @Test
    fun `beginner tier limits budget categories to 5`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertEquals(5, config.maxBudgetCategories)
    }

    @Test
    fun `beginner tier hides projections`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        assertFalse(config.showProjections)
    }

    // ── Intermediate tier tests ─────────────────────────────────────

    @Test
    fun `intermediate tier shows detailed metrics`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.INTERMEDIATE)
        assertTrue(config.showDetailedMetrics)
    }

    @Test
    fun `intermediate tier does not auto-show tooltips`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.INTERMEDIATE)
        assertFalse(config.showTooltipsByDefault)
    }

    @Test
    fun `intermediate tier hides advanced charts`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.INTERMEDIATE)
        assertFalse(config.showAdvancedCharts)
    }

    @Test
    fun `intermediate tier shows projections`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.INTERMEDIATE)
        assertTrue(config.showProjections)
    }

    @Test
    fun `intermediate tier allows 10 budget categories`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.INTERMEDIATE)
        assertEquals(10, config.maxBudgetCategories)
    }

    // ── Advanced tier tests ─────────────────────────────────────────

    @Test
    fun `advanced tier shows all features`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.ADVANCED)
        assertTrue(config.showDetailedMetrics)
        assertTrue(config.showAdvancedCharts)
        assertTrue(config.showProjections)
    }

    @Test
    fun `advanced tier allows 20 budget categories`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.ADVANCED)
        assertEquals(20, config.maxBudgetCategories)
    }

    @Test
    fun `advanced tier does not show simplified labels`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.ADVANCED)
        assertFalse(config.showSimplifiedLabels)
    }

    @Test
    fun `advanced tier does not show guided workflows`() {
        val config = ExpertiseTierConfig.configFor(ExpertiseTier.ADVANCED)
        assertFalse(config.showGuidedWorkflows)
    }

    // ── Cross-tier tests ────────────────────────────────────────────

    @Test
    fun `every tier has a config`() {
        ExpertiseTier.entries.forEach { tier ->
            val config = ExpertiseTierConfig.configFor(tier)
            assertEquals(tier, config.tier)
        }
    }

    @Test
    fun `budget categories increase with tier level`() {
        val beginner = ExpertiseTierConfig.configFor(ExpertiseTier.BEGINNER)
        val intermediate = ExpertiseTierConfig.configFor(ExpertiseTier.INTERMEDIATE)
        val advanced = ExpertiseTierConfig.configFor(ExpertiseTier.ADVANCED)
        assertTrue(beginner.maxBudgetCategories < intermediate.maxBudgetCategories)
        assertTrue(intermediate.maxBudgetCategories < advanced.maxBudgetCategories)
    }

    @Test
    fun `tier display names are not empty`() {
        ExpertiseTier.entries.forEach { tier ->
            assertTrue(tier.displayName.isNotBlank(), "Empty displayName for $tier")
            assertTrue(tier.description.isNotBlank(), "Empty description for $tier")
        }
    }

    @Test
    fun `tier ordinals follow beginner to advanced progression`() {
        assertTrue(ExpertiseTier.BEGINNER.ordinal < ExpertiseTier.INTERMEDIATE.ordinal)
        assertTrue(ExpertiseTier.INTERMEDIATE.ordinal < ExpertiseTier.ADVANCED.ordinal)
    }
}
