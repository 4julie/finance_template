// SPDX-License-Identifier: BUSL-1.1

/**
 * Daily spending accumulator with month-end projection.
 *
 * Tracks cumulative daily spending, projects month-end totals via
 * linear extrapolation, and indicates pace relative to a budget.
 * Also computes a rolling average daily spend.
 *
 * All monetary values are in integer cents. All functions are pure.
 * Uses banker's rounding (HALF_EVEN) for divisions.
 *
 * References: issue #1576
 */

import { bankersRound } from './review-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A transaction for daily spending analysis. */
export interface DailyTransaction {
  /** Transaction date as ISO 8601 string (YYYY-MM-DD). */
  readonly date: string;
  /** Amount in cents (positive = expense). */
  readonly amountCents: number;
}

/** Spending data for a single day. */
export interface DailySpend {
  /** The date (YYYY-MM-DD). */
  readonly date: string;
  /** Total spending on this day in cents. */
  readonly totalCents: number;
  /** Cumulative spending up to and including this day in cents. */
  readonly cumulativeCents: number;
}

/** Pace indicator relative to a budget. */
export type PaceStatus = 'under-budget' | 'on-track' | 'over-budget';

/** Result of month-end spending projection. */
export interface SpendingProjection {
  /** Total spent so far in cents. */
  readonly spentSoFarCents: number;
  /** Number of days elapsed in the period. */
  readonly daysElapsed: number;
  /** Total days in the period. */
  readonly totalDays: number;
  /** Average daily spending in cents (banker's rounded). */
  readonly avgDailySpendCents: number;
  /** Projected month-end total in cents. */
  readonly projectedTotalCents: number;
  /** Budget for the period in cents (0 if not set). */
  readonly budgetCents: number;
  /** Pace status relative to budget. */
  readonly pace: PaceStatus;
  /** Rolling average daily spend over the window in cents. */
  readonly rollingAvgDailySpendCents: number;
}

// ---------------------------------------------------------------------------
// Core calculations
// ---------------------------------------------------------------------------

/**
 * Accumulate transactions into per-day spending totals with cumulative sums.
 *
 * @param transactions - The transactions to accumulate.
 * @returns An array of daily spending records sorted chronologically.
 */
export function accumulateDailySpending(transactions: readonly DailyTransaction[]): DailySpend[] {
  if (transactions.length === 0) return [];

  const dayMap = new Map<string, number>();
  for (const tx of transactions) {
    dayMap.set(tx.date, (dayMap.get(tx.date) ?? 0) + tx.amountCents);
  }

  const sorted = Array.from(dayMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  let cumulative = 0;
  return sorted.map(([date, total]) => {
    cumulative += total;
    return { date, totalCents: total, cumulativeCents: cumulative };
  });
}

/**
 * Get the number of days in a given month.
 *
 * @param year - The year (e.g., 2024).
 * @param month - The month (1–12).
 * @returns Number of days in the month.
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate the day-of-month from an ISO date string.
 *
 * @param date - ISO 8601 date string (YYYY-MM-DD).
 * @returns The day number (1–31).
 */
export function dayOfMonth(date: string): number {
  return parseInt(date.substring(8, 10), 10);
}

/**
 * Determine pace status based on projected vs budget.
 *
 * @param projectedCents - Projected total spend in cents.
 * @param budgetCents - Budget for the period in cents.
 * @param tolerancePercent - Percentage tolerance for "on-track" (default 5%).
 * @returns The pace status.
 */
export function determinePace(
  projectedCents: number,
  budgetCents: number,
  tolerancePercent: number = 5,
): PaceStatus {
  if (budgetCents <= 0) return 'on-track';

  const ratio = projectedCents / budgetCents;
  const tolerance = tolerancePercent / 100;

  if (ratio > 1 + tolerance) return 'over-budget';
  if (ratio < 1 - tolerance) return 'under-budget';
  return 'on-track';
}

/**
 * Calculate a rolling average daily spend over the last N days.
 *
 * @param dailySpends - Chronologically sorted daily spending records.
 * @param windowDays - Number of days for the rolling window. Defaults to 7.
 * @returns The rolling average in cents (banker's rounded). Returns 0 for empty input.
 */
export function rollingAverageDailySpend(
  dailySpends: readonly DailySpend[],
  windowDays: number = 7,
): number {
  if (dailySpends.length === 0 || windowDays <= 0) return 0;

  const window = dailySpends.slice(-windowDays);
  const total = window.reduce((sum, d) => sum + d.totalCents, 0);
  return bankersRound(total / window.length);
}

/**
 * Project month-end spending based on current pace.
 *
 * Uses linear extrapolation: projectedTotal = (spentSoFar / daysElapsed) * totalDays.
 *
 * @param transactions - Transactions for the current month.
 * @param year - The year of the month being projected.
 * @param month - The month (1–12) being projected.
 * @param currentDay - The current day of the month (1-based).
 * @param budgetCents - Optional budget for the month in cents. Defaults to 0.
 * @param rollingWindowDays - Days for rolling average calculation. Defaults to 7.
 * @returns The spending projection with pace indicator.
 */
export function projectMonthEndSpending(
  transactions: readonly DailyTransaction[],
  year: number,
  month: number,
  currentDay: number,
  budgetCents: number = 0,
  rollingWindowDays: number = 7,
): SpendingProjection {
  const totalDays = daysInMonth(year, month);
  const daysElapsed = Math.min(Math.max(currentDay, 0), totalDays);

  const dailySpends = accumulateDailySpending(transactions);
  const spentSoFarCents =
    dailySpends.length > 0 ? dailySpends[dailySpends.length - 1].cumulativeCents : 0;

  const avgDailySpendCents = daysElapsed > 0 ? bankersRound(spentSoFarCents / daysElapsed) : 0;
  const projectedTotalCents =
    daysElapsed > 0 ? bankersRound((spentSoFarCents / daysElapsed) * totalDays) : spentSoFarCents;

  const rollingAvg = rollingAverageDailySpend(dailySpends, rollingWindowDays);
  const pace = determinePace(projectedTotalCents, budgetCents);

  return {
    spentSoFarCents,
    daysElapsed,
    totalDays,
    avgDailySpendCents,
    projectedTotalCents,
    budgetCents,
    pace,
    rollingAvgDailySpendCents: rollingAvg,
  };
}
