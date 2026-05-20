// SPDX-License-Identifier: BUSL-1.1

/**
 * Analyst consensus scoring engine.
 *
 * Aggregates analyst opinions into a weighted consensus score,
 * compares target prices against current prices, and derives
 * a consensus rating.
 *
 * All monetary values are integer cents.
 * Uses Banker's rounding (HALF_EVEN) for financial divisions.
 *
 * References: issue #1740
 */

import { bankersRound } from './concentration';
import {
  ANALYST_RATING_WEIGHTS,
  AnalystRating,
  type AnalystOpinion,
  type ConsensusResult,
} from './types';

// ---------------------------------------------------------------------------
// Consensus scoring
// ---------------------------------------------------------------------------

/**
 * Derive a consensus rating from a weighted average score.
 *
 * Maps the 1–5 scale back to an AnalystRating enum:
 * - 4.5–5.0 → STRONG_BUY
 * - 3.5–4.5 → BUY
 * - 2.5–3.5 → HOLD
 * - 1.5–2.5 → SELL
 * - 1.0–1.5 → STRONG_SELL
 *
 * @param score - Weighted average score (1–5).
 * @returns The corresponding analyst rating.
 */
export function deriveRating(score: number): AnalystRating {
  if (score >= 4.5) return AnalystRating.STRONG_BUY;
  if (score >= 3.5) return AnalystRating.BUY;
  if (score >= 2.5) return AnalystRating.HOLD;
  if (score >= 1.5) return AnalystRating.SELL;
  return AnalystRating.STRONG_SELL;
}

/**
 * Compute a weighted consensus score from analyst opinions.
 *
 * Each rating maps to a numeric weight (STRONG_BUY=5, BUY=4, HOLD=3,
 * SELL=2, STRONG_SELL=1). The score is the simple average of these weights.
 *
 * @param opinions - Array of analyst opinions.
 * @returns Weighted average score (1–5), or 0 if no opinions.
 */
export function computeWeightedScore(opinions: readonly AnalystOpinion[]): number {
  if (opinions.length === 0) return 0;

  const totalWeight = opinions.reduce((sum, o) => sum + ANALYST_RATING_WEIGHTS[o.rating], 0);
  return bankersRound(totalWeight / opinions.length, 2);
}

// ---------------------------------------------------------------------------
// Rating counts
// ---------------------------------------------------------------------------

/**
 * Count the number of opinions for each rating type.
 *
 * @param opinions - Array of analyst opinions.
 * @returns A record mapping each rating to its count.
 */
export function countRatings(opinions: readonly AnalystOpinion[]): Record<AnalystRating, number> {
  const counts: Record<AnalystRating, number> = {
    [AnalystRating.STRONG_BUY]: 0,
    [AnalystRating.BUY]: 0,
    [AnalystRating.HOLD]: 0,
    [AnalystRating.SELL]: 0,
    [AnalystRating.STRONG_SELL]: 0,
  };

  for (const o of opinions) {
    counts[o.rating]++;
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Target price analysis
// ---------------------------------------------------------------------------

/**
 * Compute the average target price from analyst opinions.
 *
 * Only opinions with non-null target prices are included.
 * Uses Banker's rounding to the nearest cent.
 *
 * @param opinions - Array of analyst opinions.
 * @returns Average target price in cents, or null if no targets are available.
 */
export function computeAverageTargetPrice(opinions: readonly AnalystOpinion[]): number | null {
  const withTargets = opinions.filter((o) => o.targetPrice !== null);
  if (withTargets.length === 0) return null;

  const total = withTargets.reduce((sum, o) => sum + o.targetPrice!, 0);
  return Math.round(total / withTargets.length);
}

/**
 * Compute the upside/downside percentage of a target price vs current price.
 *
 * @param targetPrice - Target price in cents.
 * @param currentPrice - Current price in cents.
 * @returns Upside percentage (positive = upside, negative = downside), or null if current price is 0.
 */
export function computeTargetUpside(targetPrice: number, currentPrice: number): number | null {
  if (currentPrice === 0) return null;
  return bankersRound(((targetPrice - currentPrice) / currentPrice) * 100, 2);
}

// ---------------------------------------------------------------------------
// Full consensus analysis
// ---------------------------------------------------------------------------

/**
 * Perform a full analyst consensus analysis for a security.
 *
 * Aggregates opinions into a weighted score, derives a consensus rating,
 * computes average target price, and calculates upside/downside.
 *
 * @param symbol - The ticker symbol.
 * @param opinions - Array of analyst opinions.
 * @param currentPrice - Current market price in cents.
 * @returns Complete consensus analysis result.
 */
export function analyzeConsensus(
  symbol: string,
  opinions: readonly AnalystOpinion[],
  currentPrice: number,
): ConsensusResult {
  const weightedScore = computeWeightedScore(opinions);
  const consensusRating = opinions.length > 0 ? deriveRating(weightedScore) : AnalystRating.HOLD;
  const ratingCounts = countRatings(opinions);
  const averageTargetPrice = computeAverageTargetPrice(opinions);

  const targetUpsidePercent =
    averageTargetPrice !== null ? computeTargetUpside(averageTargetPrice, currentPrice) : null;

  return {
    symbol,
    totalAnalysts: opinions.length,
    weightedScore,
    consensusRating,
    ratingCounts,
    averageTargetPrice,
    currentPrice,
    targetUpsidePercent,
  };
}
