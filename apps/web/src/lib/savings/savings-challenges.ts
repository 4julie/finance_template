// SPDX-License-Identifier: BUSL-1.1

/**
 * Savings challenges and no-spend tracking engine.
 *
 * Implements:
 * - 52-week savings challenge (escalating weekly deposits)
 * - No-spend day / week tracking with streaks
 * - Custom challenge builder with configurable increments
 * - Progress percentage and streak calculations
 *
 * All monetary values are integer cents.  Uses banker's rounding.
 *
 * Pure functions — no side effects, fully testable.
 *
 * References: issue #1640
 */

import type {
  ChallengeProgress,
  ChallengeWeek,
  CustomChallengeConfig,
  NoSpendResult,
} from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKS_IN_YEAR = 52;

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
// 52-week challenge
// ---------------------------------------------------------------------------

/**
 * Generates the schedule for a standard 52-week savings challenge.
 *
 * Week 1 saves `baseAmountCents`, week 2 saves `2 × baseAmountCents`, etc.
 *
 * @param baseAmountCents - Amount to save in week 1 in cents (e.g. 100 = $1).
 * @param completedWeeks - Set of 1-indexed week numbers already completed.
 * @returns Array of 52 `ChallengeWeek` entries.
 */
export function generate52WeekSchedule(
  baseAmountCents: number,
  completedWeeks: ReadonlySet<number> = new Set(),
): ChallengeWeek[] {
  const weeks: ChallengeWeek[] = [];
  for (let w = 1; w <= WEEKS_IN_YEAR; w++) {
    weeks.push({
      week: w,
      amountCents: w * baseAmountCents,
      completed: completedWeeks.has(w),
    });
  }
  return weeks;
}

/**
 * Calculates the total target for a 52-week challenge.
 *
 * Sum of 1 + 2 + … + 52 = 52 × 53 / 2 = 1378 units.
 *
 * @param baseAmountCents - Base weekly amount in cents.
 * @returns Total target in cents.
 */
export function calculate52WeekTarget(baseAmountCents: number): number {
  return ((WEEKS_IN_YEAR * (WEEKS_IN_YEAR + 1)) / 2) * baseAmountCents;
}

// ---------------------------------------------------------------------------
// Custom challenge
// ---------------------------------------------------------------------------

/**
 * Generates a custom challenge schedule with a configurable start amount
 * and per-period increment.
 *
 * @param config - Custom challenge configuration.
 * @param completedPeriods - Set of 1-indexed period numbers already completed.
 * @returns Array of challenge period entries.
 */
export function generateCustomSchedule(
  config: CustomChallengeConfig,
  completedPeriods: ReadonlySet<number> = new Set(),
): ChallengeWeek[] {
  const periods: ChallengeWeek[] = [];
  for (let p = 1; p <= config.totalPeriods; p++) {
    periods.push({
      week: p,
      amountCents: config.startAmountCents + (p - 1) * config.incrementCents,
      completed: completedPeriods.has(p),
    });
  }
  return periods;
}

/**
 * Calculates the total target for a custom challenge.
 *
 * @param config - Custom challenge configuration.
 * @returns Total target in cents.
 */
export function calculateCustomTarget(config: CustomChallengeConfig): number {
  let total = 0;
  for (let p = 1; p <= config.totalPeriods; p++) {
    total += config.startAmountCents + (p - 1) * config.incrementCents;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/**
 * Calculates progress for a savings challenge from its schedule.
 *
 * @param type - Challenge type.
 * @param schedule - The full challenge schedule.
 * @returns Challenge progress summary.
 */
export function calculateChallengeProgress(
  type: ChallengeProgress['type'],
  schedule: readonly ChallengeWeek[],
): ChallengeProgress {
  const totalPeriods = schedule.length;
  let completedPeriods = 0;
  let savedCents = 0;
  let targetCents = 0;
  let longestStreak = 0;
  let streak = 0;

  for (const entry of schedule) {
    targetCents += entry.amountCents;
    if (entry.completed) {
      completedPeriods++;
      savedCents += entry.amountCents;
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      streak = 0;
    }
  }
  // current streak = streak at the end of the last completed run
  const currentStreak = streak;

  const progressPercent =
    totalPeriods > 0 ? bankersRound((completedPeriods / totalPeriods) * 100) : 0;

  return {
    type,
    totalPeriods,
    completedPeriods,
    progressPercent,
    savedCents,
    targetCents,
    currentStreak,
    longestStreak,
  };
}

// ---------------------------------------------------------------------------
// No-spend tracking
// ---------------------------------------------------------------------------

/**
 * Calculates no-spend tracking metrics from an array of daily spend flags.
 *
 * @param dailySpent - Array of booleans where `true` means money was spent that day.
 *   Index 0 = first tracked day.
 * @returns No-spend result with streaks.
 */
export function calculateNoSpend(dailySpent: readonly boolean[]): NoSpendResult {
  const totalDays = dailySpent.length;
  let noSpendDays = 0;
  let longestStreak = 0;
  let streak = 0;

  for (const spent of dailySpent) {
    if (!spent) {
      noSpendDays++;
      streak++;
      if (streak > longestStreak) longestStreak = streak;
    } else {
      streak = 0;
    }
  }
  const currentStreak = streak;

  const noSpendPercent = totalDays > 0 ? bankersRound((noSpendDays / totalDays) * 100) : 0;

  return {
    noSpendDays,
    totalDays,
    noSpendPercent,
    currentStreak,
    longestStreak,
  };
}
