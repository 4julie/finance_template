// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.tips

import com.finance.core.tips.FinancialTip
import com.finance.core.tips.TipCategory
import com.finance.core.tips.TipPriority
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/**
 * Unit tests for [TipsUiState] filtering and computed properties.
 */
class TipsUiStateTest {

    private val highTip = FinancialTip(
        id = "budget-over-1",
        title = "Budget exceeded",
        description = "Over budget on dining",
        category = TipCategory.BUDGET,
        priority = TipPriority.HIGH,
    )

    private val mediumTip = FinancialTip(
        id = "goal-almost-1",
        title = "Almost there",
        description = "Goal nearly complete",
        category = TipCategory.SAVINGS,
        priority = TipPriority.MEDIUM,
    )

    private val lowTip = FinancialTip(
        id = "savings-streak",
        title = "Great streak",
        description = "Positive cash flow 3 months",
        category = TipCategory.SAVINGS,
        priority = TipPriority.LOW,
    )

    @Test
    fun `visibleTips filters out dismissed tips`() {
        val state = TipsUiState(
            tips = listOf(highTip, mediumTip, lowTip),
            dismissedTipIds = setOf("goal-almost-1"),
        )

        assertEquals(2, state.visibleTips.size)
        assertTrue(state.visibleTips.none { it.id == "goal-almost-1" })
    }

    @Test
    fun `heroTip returns first high priority visible tip`() {
        val state = TipsUiState(
            tips = listOf(lowTip, mediumTip, highTip),
        )

        assertEquals(highTip, state.heroTip)
    }

    @Test
    fun `heroTip returns null when no high priority tips`() {
        val state = TipsUiState(
            tips = listOf(lowTip, mediumTip),
        )

        assertNull(state.heroTip)
    }

    @Test
    fun `heroTip skips dismissed high priority tips`() {
        val state = TipsUiState(
            tips = listOf(highTip, mediumTip),
            dismissedTipIds = setOf("budget-over-1"),
        )

        assertNull(state.heroTip)
    }

    @Test
    fun `visibleCount reflects dismissals`() {
        val state = TipsUiState(
            tips = listOf(highTip, mediumTip, lowTip),
            dismissedTipIds = setOf("budget-over-1", "savings-streak"),
        )

        assertEquals(1, state.visibleCount)
    }

    @Test
    fun `empty tips produces empty visibleTips`() {
        val state = TipsUiState(tips = emptyList())

        assertTrue(state.visibleTips.isEmpty())
        assertNull(state.heroTip)
        assertEquals(0, state.visibleCount)
    }
}
