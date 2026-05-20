// SPDX-License-Identifier: BUSL-1.1

/**
 * Emergency runway calculator.
 *
 * Determines how many months of expenses an emergency fund can cover,
 * with both total-expense and essential-only variants.  Also projects
 * how long it will take to reach a target runway at the current savings
 * rate.
 *
 * All monetary values are integer cents.  Uses banker's rounding.
 *
 * Pure functions — no side effects, fully testable.
 *
 * References: issue #1650
 */

import type { EmergencyRunwayInput, EmergencyRunwayResult, RunwayStatus } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Recommended minimum emergency fund in months of total expenses. */
const TARGET_MONTHS = 6;

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
// Status determination
// ---------------------------------------------------------------------------

/**
 * Determines runway health status from months of total expenses covered.
 *
 * - critical:      < 1 month
 * - insufficient:  1–2 months
 * - adequate:      3–5 months
 * - strong:        ≥ 6 months
 *
 * @param months - Months of total expenses covered.
 * @returns Runway status.
 */
export function getRunwayStatus(months: number): RunwayStatus {
  if (months < 1) return 'critical';
  if (months < 3) return 'insufficient';
  if (months < 6) return 'adequate';
  return 'strong';
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Calculates emergency runway metrics.
 *
 * @param input - Emergency runway input parameters.
 * @param targetMonths - Target runway in months (defaults to 6).
 * @returns Emergency runway result.
 */
export function calculateEmergencyRunway(
  input: EmergencyRunwayInput,
  targetMonths: number = TARGET_MONTHS,
): EmergencyRunwayResult {
  const {
    emergencyFundCents,
    monthlyExpensesCents,
    essentialExpensesCents,
    monthlySavingsRateCents,
  } = input;

  // Avoid division by zero — if no expenses, fund covers infinite months.
  // We cap at a large number for display sanity.
  const totalExpenseMonths =
    monthlyExpensesCents > 0
      ? Math.floor((emergencyFundCents / monthlyExpensesCents) * 100) / 100
      : emergencyFundCents > 0
        ? Infinity
        : 0;

  const essentialExpenseMonths =
    essentialExpensesCents > 0
      ? Math.floor((emergencyFundCents / essentialExpensesCents) * 100) / 100
      : emergencyFundCents > 0
        ? Infinity
        : 0;

  const status = getRunwayStatus(totalExpenseMonths);

  // Project months to target
  let monthsToTarget: number | null = null;
  if (totalExpenseMonths < targetMonths && monthlySavingsRateCents > 0) {
    const targetCents = bankersRound(targetMonths * monthlyExpensesCents);
    const gapCents = targetCents - emergencyFundCents;
    if (gapCents > 0) {
      monthsToTarget = Math.ceil(gapCents / monthlySavingsRateCents);
    } else {
      monthsToTarget = 0;
    }
  }

  return {
    totalExpenseMonths,
    essentialExpenseMonths,
    status,
    monthsToTarget,
  };
}
