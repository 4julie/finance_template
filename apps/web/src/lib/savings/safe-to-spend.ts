// SPDX-License-Identifier: BUSL-1.1

/**
 * Safe-to-spend calculation engine.
 *
 * Calculates the amount a user can safely spend while respecting a
 * minimum balance floor and committed expenses.  Provides daily and
 * weekly spending rates plus warning thresholds.
 *
 * All monetary values are integer cents.  Uses banker's rounding.
 *
 * Pure functions — no side effects, fully testable.
 *
 * References: issue #1590
 */

import type { SafeToSpendInput, SafeToSpendResult, WarningLevel } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Percentage thresholds for warning levels (of total safe-to-spend). */
const CAUTION_THRESHOLD = 0.25;
const WARNING_THRESHOLD = 0.1;
const CRITICAL_THRESHOLD = 0;

/** Days in a week. */
const DAYS_PER_WEEK = 7;

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
// Warning level
// ---------------------------------------------------------------------------

/**
 * Determines the warning level based on remaining safe-to-spend amount
 * relative to the total income.
 *
 * @param safeCents - Remaining safe-to-spend in cents.
 * @param incomeCents - Total income for the period in cents.
 * @returns The appropriate warning level.
 */
export function getWarningLevel(safeCents: number, incomeCents: number): WarningLevel {
  if (incomeCents <= 0) return 'critical';
  const ratio = safeCents / incomeCents;
  if (ratio <= CRITICAL_THRESHOLD) return 'critical';
  if (ratio <= WARNING_THRESHOLD) return 'warning';
  if (ratio <= CAUTION_THRESHOLD) return 'caution';
  return 'safe';
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Calculates safe-to-spend for a given period.
 *
 * Formula: safe = income − committed − minimumFloor
 * Daily rate: safe / daysRemaining
 * Weekly rate: dailyRate × 7
 *
 * If the result is negative the total is clamped to 0 and daily / weekly
 * rates are also 0.
 *
 * @param input - Safe-to-spend input parameters.
 * @returns Safe-to-spend result with daily/weekly rates and warning level.
 */
export function calculateSafeToSpend(input: SafeToSpendInput): SafeToSpendResult {
  const { incomeCents, committedExpensesCents, minimumBalanceFloorCents, daysRemaining } = input;

  const rawTotal = incomeCents - committedExpensesCents - minimumBalanceFloorCents;
  const totalCents = Math.max(0, rawTotal);

  const days = Math.max(1, daysRemaining);
  const dailyRateCents = bankersRound(totalCents / days);
  const weeklyRateCents = bankersRound((totalCents / days) * DAYS_PER_WEEK);

  const warningLevel = getWarningLevel(totalCents, incomeCents);

  return {
    totalCents,
    dailyRateCents,
    weeklyRateCents,
    warningLevel,
  };
}

/**
 * Calculates remaining safe-to-spend after additional spending.
 *
 * @param original - Original safe-to-spend result.
 * @param spentCents - Amount already spent in the period in cents.
 * @param incomeCents - Total income for the period in cents (for warning re-evaluation).
 * @param daysRemaining - Days remaining in the period.
 * @returns Updated safe-to-spend result reflecting spending.
 */
export function recalculateAfterSpending(
  original: SafeToSpendResult,
  spentCents: number,
  incomeCents: number,
  daysRemaining: number,
): SafeToSpendResult {
  const remaining = Math.max(0, original.totalCents - spentCents);
  const days = Math.max(1, daysRemaining);
  const dailyRateCents = bankersRound(remaining / days);
  const weeklyRateCents = bankersRound((remaining / days) * DAYS_PER_WEEK);
  const warningLevel = getWarningLevel(remaining, incomeCents);

  return {
    totalCents: remaining,
    dailyRateCents,
    weeklyRateCents,
    warningLevel,
  };
}
