// SPDX-License-Identifier: BUSL-1.1

/**
 * Goal projection and milestone celebration engine.
 *
 * Projects when a savings goal will be completed based on current
 * contribution rate, calculates standard milestones (25 %, 50 %, 75 %,
 * 100 %), and determines on-track / behind / ahead status relative to a
 * target date.
 *
 * All monetary values are integer cents.  Uses banker's rounding.
 *
 * Pure functions — no side effects, fully testable.
 *
 * References: issue #1788
 */

import type { GoalProjection, GoalStatus, Milestone, SavingsGoal } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Standard milestone percentages. */
const MILESTONE_PERCENTS = [25, 50, 75, 100];

// ---------------------------------------------------------------------------
// Banker's rounding
// ---------------------------------------------------------------------------

/**
 * Rounds a number to the nearest integer using banker's rounding
 * (round half to even / IEEE 754 HALF_EVEN).
 */
function bankersRound(value: number): number {
  const rounded = Math.round(value);
  const floor = Math.floor(value);
  const frac = value - floor;
  if (Math.abs(frac - 0.5) < Number.EPSILON) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return rounded;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Adds a number of months to a Date and returns an ISO date string.
 *
 * @param start - Start date.
 * @param months - Months to add.
 * @returns ISO date string (YYYY-MM-DD).
 */
function addMonths(start: Date, months: number): string {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the number of whole months between two dates.
 *
 * @param from - Start date.
 * @param to - End date.
 * @returns Number of months (may be negative if `to` is before `from`).
 */
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// ---------------------------------------------------------------------------
// Goal status
// ---------------------------------------------------------------------------

/**
 * Determines on-track status for a goal.
 *
 * - **completed**: current ≥ target
 * - **ahead**: projected date is before target date
 * - **on_track**: projected date is within 1 month of target date
 * - **behind**: projected date is after target date + 1 month
 *
 * If no target date is set, status is 'on_track' (no deadline to miss).
 *
 * @param goal - The savings goal.
 * @param projectedDate - Projected completion date.
 * @returns Goal status.
 */
export function getGoalStatus(goal: SavingsGoal, projectedDate: Date): GoalStatus {
  if (goal.currentCents >= goal.targetCents) return 'completed';
  if (!goal.targetDate) return 'on_track';

  const target = new Date(goal.targetDate);
  const diffMonths = monthsBetween(projectedDate, target);

  if (diffMonths > 1) return 'ahead';
  if (diffMonths >= -1) return 'on_track';
  return 'behind';
}

// ---------------------------------------------------------------------------
// Goal projection
// ---------------------------------------------------------------------------

/**
 * Projects goal completion date and status.
 *
 * @param goal - The savings goal.
 * @param now - Current date (defaults to today).
 * @returns Goal projection result.
 */
export function projectGoal(goal: SavingsGoal, now: Date = new Date()): GoalProjection {
  const completionPercent =
    goal.targetCents > 0
      ? Math.min(100, bankersRound((goal.currentCents / goal.targetCents) * 100))
      : 100;

  // Already completed
  if (goal.currentCents >= goal.targetCents) {
    return {
      projectedDate: now.toISOString().slice(0, 10),
      status: 'completed',
      completionPercent: 100,
      monthsRemaining: 0,
      requiredMonthlyCents: null,
    };
  }

  const remainingCents = goal.targetCents - goal.currentCents;

  // No contributions — can't project
  const monthsRemaining =
    goal.monthlyContributionCents > 0
      ? Math.ceil(remainingCents / goal.monthlyContributionCents)
      : Infinity;

  const projectedDateStr =
    monthsRemaining === Infinity ? '9999-12-31' : addMonths(now, monthsRemaining);
  const projectedDate = new Date(projectedDateStr);

  const status = getGoalStatus(goal, projectedDate);

  // Required monthly to hit target date
  let requiredMonthlyCents: number | null = null;
  if (goal.targetDate) {
    const targetDate = new Date(goal.targetDate);
    const monthsToTarget = Math.max(1, monthsBetween(now, targetDate));
    requiredMonthlyCents = Math.ceil(remainingCents / monthsToTarget);
  }

  return {
    projectedDate: projectedDateStr,
    status,
    completionPercent,
    monthsRemaining: monthsRemaining === Infinity ? -1 : monthsRemaining,
    requiredMonthlyCents,
  };
}

// ---------------------------------------------------------------------------
// Milestones
// ---------------------------------------------------------------------------

/**
 * Calculates standard milestones (25 %, 50 %, 75 %, 100 %) for a goal.
 *
 * @param goal - The savings goal.
 * @param now - Current date (defaults to today).
 * @returns Array of milestone objects.
 */
export function calculateMilestones(goal: SavingsGoal, now: Date = new Date()): Milestone[] {
  return MILESTONE_PERCENTS.map((percent) => {
    const amountCents = bankersRound((goal.targetCents * percent) / 100);
    const reached = goal.currentCents >= amountCents;

    let projectedDate: string | null = null;
    if (!reached && goal.monthlyContributionCents > 0) {
      const remaining = amountCents - goal.currentCents;
      const months = Math.ceil(remaining / goal.monthlyContributionCents);
      projectedDate = addMonths(now, months);
    }

    return {
      label: `${percent}%`,
      percent,
      amountCents,
      reached,
      projectedDate,
    };
  });
}
