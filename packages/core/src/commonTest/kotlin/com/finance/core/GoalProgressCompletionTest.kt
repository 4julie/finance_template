// SPDX-License-Identifier: BUSL-1.1

package com.finance.core

import com.finance.models.*
import com.finance.models.types.*
import kotlinx.datetime.*
import kotlin.test.*

/**
 * Tests for goal progress and completion flows (#1360).
 *
 * Verifies goal creation, progress percentage calculation,
 * status transitions (Active → Completed → Cancelled),
 * accountId linking, completion detection, deadline handling,
 * and multi-goal independence.
 */
class GoalProgressCompletionTest {

    @BeforeTest
    fun setup() {
        TestFixtures.reset()
    }

    private fun createGoal(
        name: String = "Emergency Fund",
        targetAmount: Cents = Cents(1000000L), // $10,000
        currentAmount: Cents = Cents.ZERO,
        status: GoalStatus = GoalStatus.ACTIVE,
        targetDate: LocalDate? = null,
        accountId: SyncId? = null,
    ) = Goal(
        id = TestFixtures.nextId(),
        householdId = SyncId("household-1"),
        ownerId = SyncId("owner-1"),
        name = name,
        targetAmount = targetAmount,
        currentAmount = currentAmount,
        currency = Currency.USD,
        targetDate = targetDate,
        status = status,
        accountId = accountId,
        createdAt = TestFixtures.fixedInstant,
        updatedAt = TestFixtures.fixedInstant,
    )

    // ═══════════════════════════════════════════════════════════════════
    // Goal Creation
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun createGoalWithTargetAmountAndDate() {
        val goal = createGoal(
            name = "Vacation Fund",
            targetAmount = Cents(300000L), // $3,000
            targetDate = LocalDate(2025, 6, 1),
        )
        assertEquals("Vacation Fund", goal.name)
        assertEquals(Cents(300000L), goal.targetAmount)
        assertEquals(LocalDate(2025, 6, 1), goal.targetDate)
        assertEquals(GoalStatus.ACTIVE, goal.status)
        assertEquals(Cents.ZERO, goal.currentAmount)
    }

    @Test
    fun createGoalWithoutTargetDate() {
        val goal = createGoal(targetDate = null)
        assertNull(goal.targetDate)
        assertEquals(GoalStatus.ACTIVE, goal.status)
    }

    @Test
    fun rejectBlankGoalName() {
        assertFailsWith<IllegalArgumentException> {
            createGoal(name = "")
        }
    }

    @Test
    fun rejectZeroTargetAmount() {
        assertFailsWith<IllegalArgumentException> {
            createGoal(targetAmount = Cents.ZERO)
        }
    }

    @Test
    fun rejectNegativeTargetAmount() {
        assertFailsWith<IllegalArgumentException> {
            createGoal(targetAmount = Cents(-1L))
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Progress Percentage
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun progressAtZero() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents.ZERO,
        )
        assertEquals(0.0, goal.progress)
    }

    @Test
    fun progressAt25Percent() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(25000L),
        )
        assertEquals(0.25, goal.progress)
    }

    @Test
    fun progressAt50Percent() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(50000L),
        )
        assertEquals(0.5, goal.progress)
    }

    @Test
    fun progressAt100Percent() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(100000L),
        )
        assertEquals(1.0, goal.progress)
    }

    @Test
    fun progressClampedAtOneWhenOverTarget() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(150000L),
        )
        assertEquals(1.0, goal.progress) // clamped
    }

    @Test
    fun progressClampedAtZeroWhenNegativeCurrent() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(-500L),
        )
        assertEquals(0.0, goal.progress) // clamped
    }

    @Test
    fun progressWithSingleCent() {
        val goal = createGoal(
            targetAmount = Cents(1L),
            currentAmount = Cents(1L),
        )
        assertEquals(1.0, goal.progress)
        assertTrue(goal.isComplete)
    }

    @Test
    fun progressWithLargeAmounts() {
        val goal = createGoal(
            targetAmount = Cents(100_000_000_00L), // $1 billion
            currentAmount = Cents(50_000_000_00L), // $500 million
        )
        assertEquals(0.5, goal.progress)
    }

    @Test
    fun progressCalculationUsesIntegerCentsDivision() {
        // Verify the formula: (current * 100) / target style would be integer
        val goal = createGoal(
            targetAmount = Cents(3L),
            currentAmount = Cents(1L),
        )
        // 1/3 ≈ 0.333...
        val expected = 1.0 / 3.0
        assertEquals(expected, goal.progress, 0.0001)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Status Transitions
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun statusDefaultIsActive() {
        val goal = createGoal()
        assertEquals(GoalStatus.ACTIVE, goal.status)
    }

    @Test
    fun transitionActiveToCompleted() {
        val goal = createGoal(status = GoalStatus.ACTIVE)
        val completed = goal.copy(status = GoalStatus.COMPLETED)
        assertEquals(GoalStatus.COMPLETED, completed.status)
    }

    @Test
    fun transitionActiveToPaused() {
        val goal = createGoal(status = GoalStatus.ACTIVE)
        val paused = goal.copy(status = GoalStatus.PAUSED)
        assertEquals(GoalStatus.PAUSED, paused.status)
    }

    @Test
    fun transitionActiveToCancelled() {
        val goal = createGoal(status = GoalStatus.ACTIVE)
        val cancelled = goal.copy(status = GoalStatus.CANCELLED)
        assertEquals(GoalStatus.CANCELLED, cancelled.status)
    }

    @Test
    fun transitionPausedToActive() {
        val goal = createGoal(status = GoalStatus.PAUSED)
        val resumed = goal.copy(status = GoalStatus.ACTIVE)
        assertEquals(GoalStatus.ACTIVE, resumed.status)
    }

    @Test
    fun allGoalStatusesExist() {
        val statuses = GoalStatus.entries
        assertEquals(4, statuses.size)
        assertTrue(statuses.contains(GoalStatus.ACTIVE))
        assertTrue(statuses.contains(GoalStatus.PAUSED))
        assertTrue(statuses.contains(GoalStatus.COMPLETED))
        assertTrue(statuses.contains(GoalStatus.CANCELLED))
    }

    // ═══════════════════════════════════════════════════════════════════
    // Goal with Linked Account (accountId)
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun goalWithLinkedAccount() {
        val goal = createGoal(accountId = SyncId("savings-account"))
        assertEquals(SyncId("savings-account"), goal.accountId)
    }

    @Test
    fun goalWithoutLinkedAccount() {
        val goal = createGoal(accountId = null)
        assertNull(goal.accountId)
    }

    @Test
    fun linkAccountToExistingGoal() {
        val goal = createGoal(accountId = null)
        val linked = goal.copy(accountId = SyncId("new-savings"))
        assertNull(goal.accountId)
        assertEquals(SyncId("new-savings"), linked.accountId)
    }

    @Test
    fun unlinkAccountFromGoal() {
        val goal = createGoal(accountId = SyncId("old-savings"))
        val unlinked = goal.copy(accountId = null)
        assertNull(unlinked.accountId)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Goal Completion Detection
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun isCompleteWhenCurrentEqualsTarget() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(100000L),
        )
        assertTrue(goal.isComplete)
    }

    @Test
    fun isCompleteWhenCurrentExceedsTarget() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(120000L),
        )
        assertTrue(goal.isComplete)
    }

    @Test
    fun isNotCompleteWhenBelowTarget() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(99999L),
        )
        assertFalse(goal.isComplete)
    }

    @Test
    fun isNotCompleteAtZero() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents.ZERO,
        )
        assertFalse(goal.isComplete)
    }

    @Test
    fun completeGoalShouldTransitionStatus() {
        val goal = createGoal(
            targetAmount = Cents(100000L),
            currentAmount = Cents(100000L),
        )
        assertTrue(goal.isComplete)
        // Application logic should transition to COMPLETED
        val completed = goal.copy(status = GoalStatus.COMPLETED)
        assertEquals(GoalStatus.COMPLETED, completed.status)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Goal Deadline Handling
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun goalPastDue() {
        val today = LocalDate(2024, 7, 1)
        val goal = createGoal(
            targetDate = LocalDate(2024, 6, 30),
            currentAmount = Cents(50000L),
            targetAmount = Cents(100000L),
        )
        assertTrue(goal.targetDate!! < today) // past due
        assertFalse(goal.isComplete) // not yet achieved
    }

    @Test
    fun goalOnTrack() {
        val today = LocalDate(2024, 6, 15)
        val goal = createGoal(
            targetDate = LocalDate(2024, 12, 31),
            targetAmount = Cents(120000L),
            currentAmount = Cents(60000L), // 50% with 50% time remaining
        )
        assertTrue(goal.targetDate!! > today)
        assertEquals(0.5, goal.progress)
    }

    @Test
    fun goalDeadlineTodayAndComplete() {
        val today = LocalDate(2024, 6, 15)
        val goal = createGoal(
            targetDate = today,
            targetAmount = Cents(100000L),
            currentAmount = Cents(100000L),
        )
        assertEquals(today, goal.targetDate)
        assertTrue(goal.isComplete)
    }

    @Test
    fun requiredDailySavingsCalculation() {
        val targetAmount = Cents(100000L)  // $1,000
        val currentAmount = Cents(40000L)  // $400
        val daysRemaining = 30

        val remaining = targetAmount - currentAmount // $600
        val dailySavings = remaining.amount / daysRemaining // 2000 cents = $20

        assertEquals(2000L, dailySavings)
    }

    @Test
    fun requiredDailySavingsWhenAlreadyComplete() {
        val targetAmount = Cents(100000L)
        val currentAmount = Cents(100000L)
        val daysRemaining = 30

        val remaining = targetAmount - currentAmount
        assertTrue(remaining.isZero())
        val dailySavings = if (remaining.amount <= 0L) 0L else remaining.amount / daysRemaining
        assertEquals(0L, dailySavings)
    }

    @Test
    fun projectedCompletionDate() {
        val today = LocalDate(2024, 6, 15)
        val targetAmount = Cents(100000L)
        val currentAmount = Cents(50000L)
        val avgDailySavings = 1000L // $10/day

        val remaining = targetAmount - currentAmount // 50000 cents
        val daysToComplete = (remaining.amount / avgDailySavings).toInt() // 50 days

        val projectedDate = today.plus(daysToComplete, DateTimeUnit.DAY)
        assertEquals(LocalDate(2024, 8, 4), projectedDate)
    }

    // ═══════════════════════════════════════════════════════════════════
    // Multiple Goals — Independent Tracking
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun multipleGoalsTrackIndependently() {
        val emergency = createGoal(
            name = "Emergency Fund",
            targetAmount = Cents(1000000L),
            currentAmount = Cents(500000L),
        )
        val vacation = createGoal(
            name = "Vacation",
            targetAmount = Cents(300000L),
            currentAmount = Cents(100000L),
        )
        val car = createGoal(
            name = "New Car",
            targetAmount = Cents(2000000L),
            currentAmount = Cents.ZERO,
        )

        assertEquals(0.5, emergency.progress)
        assertEquals(1.0 / 3.0, vacation.progress, 0.001)
        assertEquals(0.0, car.progress)

        assertFalse(emergency.isComplete)
        assertFalse(vacation.isComplete)
        assertFalse(car.isComplete)
    }

    @Test
    fun updateOneGoalDoesNotAffectOthers() {
        val goal1 = createGoal(
            name = "Goal 1",
            targetAmount = Cents(100000L),
            currentAmount = Cents(50000L),
        )
        val goal2 = createGoal(
            name = "Goal 2",
            targetAmount = Cents(200000L),
            currentAmount = Cents(100000L),
        )

        val updatedGoal1 = goal1.copy(currentAmount = Cents(100000L))

        assertTrue(updatedGoal1.isComplete)
        assertEquals(0.5, goal2.progress) // unchanged
    }

    // ═══════════════════════════════════════════════════════════════════
    // Edge Cases
    // ═══════════════════════════════════════════════════════════════════

    @Test
    fun goalWithSingleCentTarget() {
        val goal = createGoal(
            targetAmount = Cents(1L),
            currentAmount = Cents.ZERO,
        )
        assertEquals(0.0, goal.progress)
        assertFalse(goal.isComplete)

        val completed = goal.copy(currentAmount = Cents(1L))
        assertEquals(1.0, completed.progress)
        assertTrue(completed.isComplete)
    }

    @Test
    fun goalOptionalFieldsDefaults() {
        val goal = createGoal()
        assertNull(goal.targetDate)
        assertNull(goal.accountId)
        assertNull(goal.icon)
        assertNull(goal.color)
        assertEquals(GoalStatus.ACTIVE, goal.status)
    }

    @Test
    fun goalSoftDelete() {
        val goal = createGoal()
        val deleted = goal.copy(
            deletedAt = Instant.parse("2024-08-01T00:00:00Z"),
        )
        assertNull(goal.deletedAt)
        assertNotNull(deleted.deletedAt)
    }

    @Test
    fun goalLeapYearTargetDate() {
        val goal = createGoal(
            targetDate = LocalDate(2024, 2, 29),
        )
        assertEquals(29, goal.targetDate!!.dayOfMonth)
    }

    @Test
    fun goalEndOfYearTargetDate() {
        val goal = createGoal(
            targetDate = LocalDate(2024, 12, 31),
        )
        assertEquals(12, goal.targetDate!!.monthNumber)
        assertEquals(31, goal.targetDate!!.dayOfMonth)
    }
}
