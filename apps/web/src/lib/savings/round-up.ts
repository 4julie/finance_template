// SPDX-License-Identifier: BUSL-1.1

/**
 * Round-up savings calculator.
 *
 * Determines how much a user would save by rounding each transaction
 * up to the nearest dollar, $5, or $10.  Supports a configurable
 * multiplier (e.g. 2× round-up) and projects annual savings from a
 * sample period.
 *
 * All monetary values are integer cents.  Uses banker's rounding.
 *
 * Pure functions — no side effects, fully testable.
 *
 * References: issue #1630
 */

import type { RoundUpConfig, RoundUpResult, RoundUpTransaction } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CENTS_PER_DOLLAR = 100;
const CENTS_PER_FIVE = 500;
const CENTS_PER_TEN = 1000;
const DAYS_PER_YEAR = 365;

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
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns the round-up unit in cents for a given target.
 *
 * @param target - 'dollar' (100), 'five' (500), or 'ten' (1000).
 * @returns The rounding unit in cents.
 */
function roundUpUnit(target: RoundUpConfig['target']): number {
  switch (target) {
    case 'dollar':
      return CENTS_PER_DOLLAR;
    case 'five':
      return CENTS_PER_FIVE;
    case 'ten':
      return CENTS_PER_TEN;
  }
}

/**
 * Calculates the round-up amount for a single transaction.
 *
 * If the transaction is already an exact multiple of the target unit,
 * the round-up is 0 (not a full unit).
 *
 * @param amountCents - Transaction amount in cents (positive).
 * @param config - Round-up configuration.
 * @returns The round-up amount in cents.
 */
export function calculateSingleRoundUp(amountCents: number, config: RoundUpConfig): number {
  if (amountCents <= 0) return 0;

  const unit = roundUpUnit(config.target);
  const remainder = amountCents % unit;

  if (remainder === 0) return 0;

  const baseRoundUp = unit - remainder;
  return bankersRound(baseRoundUp * Math.max(1, config.multiplier));
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/**
 * Calculates total round-up savings for a set of transactions.
 *
 * @param transactions - Array of transactions to calculate round-ups for.
 * @param config - Round-up configuration (target and multiplier).
 * @param periodDays - Number of days the transactions span (for annual projection).
 * @returns Aggregated round-up result with total, average, and annual projection.
 */
export function calculateRoundUpSavings(
  transactions: readonly RoundUpTransaction[],
  config: RoundUpConfig,
  periodDays: number,
): RoundUpResult {
  if (transactions.length === 0) {
    return { totalCents: 0, averageCents: 0, projectedAnnualCents: 0 };
  }

  let totalCents = 0;
  for (const txn of transactions) {
    totalCents += calculateSingleRoundUp(txn.amountCents, config);
  }

  const averageCents = bankersRound(totalCents / transactions.length);

  const safePeriod = Math.max(1, periodDays);
  const dailyRate = totalCents / safePeriod;
  const projectedAnnualCents = bankersRound(dailyRate * DAYS_PER_YEAR);

  return { totalCents, averageCents, projectedAnnualCents };
}
