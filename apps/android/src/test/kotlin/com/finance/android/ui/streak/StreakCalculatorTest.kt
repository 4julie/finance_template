// SPDX-License-Identifier: BUSL-1.1

package com.finance.android.ui.streak

import kotlinx.datetime.DateTimeUnit
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * Unit tests for [StreakCalculator].
 *
 * Tests cover:
 * - Empty input
 * - Single-day streak (today / yesterday)
 * - Multi-day consecutive streaks
 * - Gap handling (streak reset)
 * - Forgiving yesterday logic
 * - Longest streak computation
 * - Non-manipulative message content
 */
class StreakCalculatorTest {

    private val today = LocalDate(2025, 4, 15)

    // ── currentStreak ───────────────────────────────────────────────────

    @Test
    fun `empty dates returns 0`() {
        assertEquals(0, StreakCalculator.currentStreak(emptySet(), today))
    }

    @Test
    fun `today only returns 1`() {
        val dates = setOf(today)
        assertEquals(1, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `yesterday only returns 1 (forgiving)`() {
        val yesterday = LocalDate(2025, 4, 14)
        val dates = setOf(yesterday)
        assertEquals(1, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `today and yesterday returns 2`() {
        val dates = setOf(
            LocalDate(2025, 4, 14),
            LocalDate(2025, 4, 15),
        )
        assertEquals(2, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `7 consecutive days ending today returns 7`() {
        val dates = (0..6).map { LocalDate(2025, 4, 15 - it) }.toSet()
        assertEquals(7, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `gap breaks the streak`() {
        val dates = setOf(
            LocalDate(2025, 4, 15), // today
            LocalDate(2025, 4, 14),
            // gap on April 13
            LocalDate(2025, 4, 12),
            LocalDate(2025, 4, 11),
        )
        assertEquals(2, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `no today or yesterday returns 0`() {
        val dates = setOf(
            LocalDate(2025, 4, 10),
            LocalDate(2025, 4, 9),
        )
        assertEquals(0, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `yesterday with trailing consecutive days counts correctly`() {
        // User hasn't logged today yet, but has 5 days ending yesterday
        val dates = (1..5).map { LocalDate(2025, 4, 15 - it) }.toSet()
        assertEquals(5, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `single date two days ago returns 0`() {
        val dates = setOf(LocalDate(2025, 4, 13))
        assertEquals(0, StreakCalculator.currentStreak(dates, today))
    }

    @Test
    fun `30 day streak counts correctly`() {
        val dates = (0..29).map { today.minus(it, DateTimeUnit.DAY) }.toSet()
        assertEquals(30, StreakCalculator.currentStreak(dates, today))
    }

    // ── longestStreak ───────────────────────────────────────────────────

    @Test
    fun `longestStreak with empty set returns 0`() {
        assertEquals(0, StreakCalculator.longestStreak(emptySet()))
    }

    @Test
    fun `longestStreak with single date returns 1`() {
        assertEquals(1, StreakCalculator.longestStreak(setOf(today)))
    }

    @Test
    fun `longestStreak finds the longest consecutive run`() {
        val dates = setOf(
            // Run of 3
            LocalDate(2025, 3, 1),
            LocalDate(2025, 3, 2),
            LocalDate(2025, 3, 3),
            // Gap
            // Run of 5
            LocalDate(2025, 3, 10),
            LocalDate(2025, 3, 11),
            LocalDate(2025, 3, 12),
            LocalDate(2025, 3, 13),
            LocalDate(2025, 3, 14),
            // Gap
            // Run of 2
            LocalDate(2025, 3, 20),
            LocalDate(2025, 3, 21),
        )
        assertEquals(5, StreakCalculator.longestStreak(dates))
    }

    @Test
    fun `longestStreak with all consecutive returns total count`() {
        val dates = (1..10).map { LocalDate(2025, 1, it) }.toSet()
        assertEquals(10, StreakCalculator.longestStreak(dates))
    }

    @Test
    fun `longestStreak with all separate days returns 1`() {
        val dates = setOf(
            LocalDate(2025, 1, 1),
            LocalDate(2025, 1, 3),
            LocalDate(2025, 1, 5),
        )
        assertEquals(1, StreakCalculator.longestStreak(dates))
    }

    // ── streakMessage ───────────────────────────────────────────────────

    @Test
    fun `message for 0 days is encouraging, not guilt-tripping`() {
        val msg = StreakCalculator.streakMessage(0)
        assertTrue(msg.isNotBlank())
        // Must NOT contain manipulative language
        assertTrue(!msg.contains("lose", ignoreCase = true))
        assertTrue(!msg.contains("break", ignoreCase = true))
        assertTrue(!msg.contains("miss", ignoreCase = true))
    }

    @Test
    fun `message for 1 day is positive`() {
        val msg = StreakCalculator.streakMessage(1)
        assertTrue(msg.contains("logged", ignoreCase = true) || msg.contains("nice", ignoreCase = true))
    }

    @Test
    fun `message for 2 days acknowledges the start`() {
        val msg = StreakCalculator.streakMessage(2)
        assertTrue(msg.isNotBlank())
    }

    @Test
    fun `message for 5 days is warm`() {
        val msg = StreakCalculator.streakMessage(5)
        assertTrue(msg.contains("5"))
    }

    @Test
    fun `message for 7 days celebrates a week`() {
        val msg = StreakCalculator.streakMessage(7)
        assertTrue(msg.contains("week", ignoreCase = true))
    }

    @Test
    fun `message for 14 days acknowledges consistency`() {
        val msg = StreakCalculator.streakMessage(14)
        assertTrue(msg.contains("14"))
    }

    @Test
    fun `message for 30 days celebrates dedication`() {
        val msg = StreakCalculator.streakMessage(30)
        assertTrue(msg.contains("30"))
        assertTrue(msg.contains("dedication", ignoreCase = true) || msg.contains("remarkable", ignoreCase = true))
    }

    @Test
    fun `no message contains manipulative language`() {
        val badWords = listOf("lose", "break", "miss", "don't", "won't", "fail", "gone", "lost")
        for (days in listOf(0, 1, 2, 3, 5, 7, 10, 14, 21, 30, 100)) {
            val msg = StreakCalculator.streakMessage(days)
            for (word in badWords) {
                assertTrue(
                    !msg.contains(word, ignoreCase = true),
                    "Message for $days days contains manipulative word '$word': $msg",
                )
            }
        }
    }
}
