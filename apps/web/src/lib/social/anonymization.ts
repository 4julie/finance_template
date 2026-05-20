// SPDX-License-Identifier: BUSL-1.1

/**
 * Data anonymization for social spending benchmarks.
 *
 * Ensures privacy by rounding amounts, stripping PII, adding
 * differential privacy noise, and tracking a privacy budget
 * (epsilon). No raw amounts or merchant names are ever exposed.
 *
 * References: #1817
 */

import type { AnonymizedSpendingSummary, BenchmarkCategory } from './types';
import { bankersRound } from './benchmarks';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rounding granularity in cents ($50 = 5000 cents). */
const ROUNDING_GRANULARITY_CENTS = 5000;

/** Default maximum privacy budget (epsilon). */
const DEFAULT_MAX_EPSILON = 1.0;

// ---------------------------------------------------------------------------
// Privacy Budget Tracker
// ---------------------------------------------------------------------------

/** Tracks cumulative differential privacy spend (epsilon). */
export interface PrivacyBudget {
  readonly spent: number;
  readonly max: number;
}

/**
 * Creates a fresh privacy budget.
 *
 * @param maxEpsilon - Maximum allowable epsilon. Defaults to 1.0.
 * @returns A new PrivacyBudget with zero spend.
 */
export function createPrivacyBudget(maxEpsilon: number = DEFAULT_MAX_EPSILON): PrivacyBudget {
  return { spent: 0, max: maxEpsilon };
}

/**
 * Returns an updated budget with the given epsilon consumed.
 * Throws if the budget would be exceeded.
 *
 * @param budget - Current privacy budget.
 * @param epsilon - Privacy cost of the operation.
 * @returns Updated PrivacyBudget.
 */
export function consumeBudget(budget: PrivacyBudget, epsilon: number): PrivacyBudget {
  const newSpent = budget.spent + epsilon;
  if (newSpent > budget.max) {
    throw new Error(
      `Privacy budget exceeded: spending ${epsilon} would reach ${newSpent}, max is ${budget.max}`,
    );
  }
  return { spent: newSpent, max: budget.max };
}

/**
 * Returns the remaining epsilon in the budget.
 *
 * @param budget - Current privacy budget.
 * @returns Remaining epsilon.
 */
export function remainingBudget(budget: PrivacyBudget): number {
  return budget.max - budget.spent;
}

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/**
 * Rounds an amount in cents to the nearest $50 (5000 cents)
 * using Banker's rounding.
 *
 * @param amountCents - Raw amount in cents.
 * @returns Amount rounded to nearest 5000 cents.
 */
export function roundToNearest50Dollars(amountCents: number): number {
  return bankersRound(amountCents / ROUNDING_GRANULARITY_CENTS) * ROUNDING_GRANULARITY_CENTS;
}

// ---------------------------------------------------------------------------
// Differential Privacy Noise
// ---------------------------------------------------------------------------

/**
 * Generates Laplace noise for differential privacy.
 *
 * Uses the inverse CDF method: noise = -b * sign(u) * ln(1 - 2|u|)
 * where u ~ Uniform(-0.5, 0.5) and b = sensitivity / epsilon.
 *
 * @param sensitivity - The query sensitivity (max change from one record), in cents.
 * @param epsilon - Privacy parameter (smaller = more private).
 * @param randomSource - Optional random number generator (0–1) for testing.
 * @returns Noise value in cents (Banker's rounded to integer).
 */
export function generateLaplaceNoise(
  sensitivity: number,
  epsilon: number,
  randomSource: () => number = Math.random,
): number {
  if (epsilon <= 0) {
    throw new Error('Epsilon must be positive');
  }

  const b = sensitivity / epsilon;
  const u = randomSource() - 0.5;

  // Avoid log(0)
  const absU = Math.abs(u);
  const clamped = Math.min(absU, 0.4999999);

  const noise = -b * Math.sign(u) * Math.log(1 - 2 * clamped);
  return bankersRound(noise) || 0; // Normalize -0 to 0
}

/**
 * Adds differential privacy noise to an amount in cents.
 *
 * The noised value is clamped to a minimum of 0 (no negative spending).
 *
 * @param amountCents - The true amount in cents.
 * @param sensitivity - Query sensitivity in cents.
 * @param epsilon - Privacy parameter.
 * @param randomSource - Optional random source for testing.
 * @returns Noised amount in cents (non-negative).
 */
export function addNoise(
  amountCents: number,
  sensitivity: number,
  epsilon: number,
  randomSource?: () => number,
): number {
  const noise = generateLaplaceNoise(sensitivity, epsilon, randomSource);
  return Math.max(0, amountCents + noise);
}

// ---------------------------------------------------------------------------
// Full Anonymization Pipeline
// ---------------------------------------------------------------------------

/** Input for anonymization: a raw category spend for a month. */
export interface RawCategorySpend {
  readonly category: BenchmarkCategory;
  readonly amountCents: number;
  /** ISO month label, e.g. "2024-01". */
  readonly month: string;
}

/**
 * Anonymizes a spending record for social sharing.
 *
 * Pipeline:
 * 1. Strip merchant names (not present in input — category only)
 * 2. Round amount to nearest $50
 * 3. Add differential privacy noise
 *
 * @param raw - Raw category spending data.
 * @param epsilon - Privacy parameter for noise generation.
 * @param sensitivity - Query sensitivity in cents. Defaults to 5000 ($50).
 * @param randomSource - Optional random source for deterministic testing.
 * @returns An anonymized summary safe for social sharing.
 */
export function anonymizeSpending(
  raw: RawCategorySpend,
  epsilon: number,
  sensitivity: number = ROUNDING_GRANULARITY_CENTS,
  randomSource?: () => number,
): AnonymizedSpendingSummary {
  const rounded = roundToNearest50Dollars(raw.amountCents);
  const noised = addNoise(rounded, sensitivity, epsilon, randomSource);
  // Re-round after noise to maintain $50 granularity
  const finalAmount = roundToNearest50Dollars(noised);

  return {
    category: raw.category,
    roundedAmountCents: finalAmount,
    month: raw.month,
  };
}

/**
 * Anonymizes a batch of spending records, tracking the privacy budget.
 *
 * Each record consumes the specified epsilon from the budget. If the
 * budget is exhausted mid-batch, only the records that fit within
 * budget are returned.
 *
 * @param records - Raw spending records.
 * @param epsilonPerRecord - Privacy cost per record.
 * @param budget - Current privacy budget.
 * @param sensitivity - Query sensitivity in cents.
 * @param randomSource - Optional random source for testing.
 * @returns Tuple of [anonymized records, updated budget].
 */
export function anonymizeBatch(
  records: readonly RawCategorySpend[],
  epsilonPerRecord: number,
  budget: PrivacyBudget,
  sensitivity: number = ROUNDING_GRANULARITY_CENTS,
  randomSource?: () => number,
): [readonly AnonymizedSpendingSummary[], PrivacyBudget] {
  const results: AnonymizedSpendingSummary[] = [];
  let currentBudget = budget;

  for (const record of records) {
    if (remainingBudget(currentBudget) < epsilonPerRecord) {
      break;
    }

    currentBudget = consumeBudget(currentBudget, epsilonPerRecord);
    results.push(anonymizeSpending(record, epsilonPerRecord, sensitivity, randomSource));
  }

  return [results, currentBudget];
}
