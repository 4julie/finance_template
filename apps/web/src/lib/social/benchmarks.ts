// SPDX-License-Identifier: BUSL-1.1

/**
 * Percentile-based spending benchmarks engine.
 *
 * Pure functions for computing percentile ranks, category comparisons,
 * and aggregate spending efficiency scores. All monetary values in
 * integer cents.
 *
 * References: #1817
 */

import type {
  BenchmarkCategory,
  BenchmarkComparison,
  BenchmarkData,
  PercentileResult,
} from './types';

// ---------------------------------------------------------------------------
// Banker's Rounding Helper
// ---------------------------------------------------------------------------

/**
 * Rounds a number using Banker's rounding (round half to even).
 *
 * @param value - The number to round.
 * @returns The rounded integer.
 */
export function bankersRound(value: number): number {
  const floored = Math.floor(value);
  const decimal = value - floored;

  if (Math.abs(decimal - 0.5) < Number.EPSILON) {
    // Exactly half — round to even
    return floored % 2 === 0 ? floored : floored + 1;
  }

  return Math.round(value);
}

// ---------------------------------------------------------------------------
// Percentile Calculation
// ---------------------------------------------------------------------------

/**
 * Computes the percentile rank of a value within a sorted distribution.
 *
 * Uses the "percentage of values below" method: the percentage of
 * distribution values that are strictly less than the given value.
 *
 * @param valueCents - The value to rank, in cents.
 * @param distributionCents - A sorted (ascending) array of observed values in cents.
 * @returns A PercentileResult with the percentile rank (0–100).
 */
export function computePercentile(
  valueCents: number,
  distributionCents: readonly number[],
): PercentileResult {
  if (distributionCents.length === 0) {
    return { valueCents, percentile: 0 };
  }

  let countBelow = 0;
  for (const v of distributionCents) {
    if (v < valueCents) {
      countBelow++;
    }
  }

  const percentile = bankersRound((countBelow / distributionCents.length) * 100);

  return {
    valueCents,
    percentile: Math.min(100, Math.max(0, percentile)),
  };
}

// ---------------------------------------------------------------------------
// Category Comparison
// ---------------------------------------------------------------------------

/**
 * Compares user spending against peer benchmark data for a single category.
 *
 * @param userSpendCents - User's spending in cents.
 * @param benchmark - Peer group benchmark data for the category.
 * @returns A BenchmarkComparison with percentile rank and deviation from median.
 */
export function compareCategorySpending(
  userSpendCents: number,
  benchmark: BenchmarkData,
): BenchmarkComparison {
  const { percentile } = computePercentile(userSpendCents, benchmark.distributionCents);

  return {
    category: benchmark.category,
    userSpendCents,
    peerMedianCents: benchmark.medianCents,
    peerMeanCents: benchmark.meanCents,
    percentile,
    differenceFromMedianCents: userSpendCents - benchmark.medianCents,
  };
}

// ---------------------------------------------------------------------------
// Spending Efficiency Score
// ---------------------------------------------------------------------------

/**
 * Computes an aggregate spending efficiency score across multiple categories.
 *
 * The score reflects how efficiently the user spends compared to peers.
 * A score of 50 means spending is at the median across all categories.
 * Lower scores indicate the user spends less than peers; higher scores
 * indicate more.
 *
 * The calculation uses a weighted average of per-category percentiles,
 * weighted by the user's spend in each category relative to total spend.
 *
 * @param comparisons - Array of per-category benchmark comparisons.
 * @returns An efficiency score from 0 to 100.
 */
export function computeSpendingEfficiencyScore(
  comparisons: readonly BenchmarkComparison[],
): number {
  if (comparisons.length === 0) {
    return 50;
  }

  const totalSpend = comparisons.reduce((sum, c) => sum + Math.abs(c.userSpendCents), 0);

  if (totalSpend === 0) {
    return 50;
  }

  const weightedSum = comparisons.reduce((sum, c) => {
    const weight = Math.abs(c.userSpendCents) / totalSpend;
    return sum + c.percentile * weight;
  }, 0);

  return bankersRound(Math.min(100, Math.max(0, weightedSum)));
}

// ---------------------------------------------------------------------------
// Median / Mean Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the median of a sorted array of numbers.
 *
 * @param sorted - A sorted (ascending) array of numbers.
 * @returns The median value, or 0 for empty arrays.
 */
export function computeMedian(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;

  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return bankersRound((sorted[mid - 1] + sorted[mid]) / 2);
  }

  return sorted[mid];
}

/**
 * Computes the mean of an array of numbers.
 *
 * @param values - Array of numbers.
 * @returns The mean value (Banker's rounded), or 0 for empty arrays.
 */
export function computeMean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return bankersRound(sum / values.length);
}

/**
 * Builds a BenchmarkData object from a peer group and raw spending values.
 *
 * @param category - The spending category.
 * @param peerGroup - The peer group definition.
 * @param spendingValuesCents - Raw spending values from the peer group (unsorted is OK).
 * @returns A fully computed BenchmarkData.
 */
export function buildBenchmarkData(
  category: BenchmarkCategory,
  peerGroup: BenchmarkData['peerGroup'],
  spendingValuesCents: readonly number[],
): BenchmarkData {
  const sorted = [...spendingValuesCents].sort((a, b) => a - b);

  return {
    category,
    peerGroup,
    distributionCents: sorted,
    medianCents: computeMedian(sorted),
    meanCents: computeMean(sorted),
  };
}
