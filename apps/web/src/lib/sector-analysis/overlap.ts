// SPDX-License-Identifier: BUSL-1.1

/**
 * Portfolio overlap detection engine.
 *
 * Compares two portfolios to find shared holdings, compute overlap percentages,
 * and estimate weight-based correlation.
 *
 * All monetary values are integer cents.
 * Uses Banker's rounding (HALF_EVEN) for financial divisions.
 *
 * References: issue #1603
 */

import { bankersRound } from './concentration';
import type { OverlapAnalysis, PortfolioHolding } from './types';

// ---------------------------------------------------------------------------
// Overlap Analysis
// ---------------------------------------------------------------------------

/**
 * Analyze the overlap between two portfolios.
 *
 * Overlap is measured as the percentage of each portfolio's value
 * that is invested in shared holdings (by symbol). A correlation
 * estimate is derived from the minimum-weight overlap method.
 *
 * @param portfolioA - Holdings in the first portfolio.
 * @param portfolioB - Holdings in the second portfolio.
 * @returns Overlap analysis result with shared holdings and correlation estimate.
 */
export function analyzeOverlap(
  portfolioA: readonly PortfolioHolding[],
  portfolioB: readonly PortfolioHolding[],
): OverlapAnalysis {
  if (portfolioA.length === 0 && portfolioB.length === 0) {
    return {
      overlapPercentA: 0,
      overlapPercentB: 0,
      overlapPercentAvg: 0,
      sharedSymbols: [],
      uniqueToA: 0,
      uniqueToB: 0,
      correlationEstimate: 0,
    };
  }

  // Build lookup maps by symbol
  const mapA = new Map<string, number>();
  for (const h of portfolioA) {
    mapA.set(h.symbol, (mapA.get(h.symbol) ?? 0) + h.marketValue);
  }

  const mapB = new Map<string, number>();
  for (const h of portfolioB) {
    mapB.set(h.symbol, (mapB.get(h.symbol) ?? 0) + h.marketValue);
  }

  // Find shared symbols
  const sharedSymbols: string[] = [];
  for (const symbol of mapA.keys()) {
    if (mapB.has(symbol)) {
      sharedSymbols.push(symbol);
    }
  }
  sharedSymbols.sort();

  // Calculate total values
  const totalA = portfolioA.reduce((sum, h) => sum + h.marketValue, 0);
  const totalB = portfolioB.reduce((sum, h) => sum + h.marketValue, 0);

  // Calculate shared value in each portfolio
  let sharedValueA = 0;
  let sharedValueB = 0;
  for (const symbol of sharedSymbols) {
    sharedValueA += mapA.get(symbol) ?? 0;
    sharedValueB += mapB.get(symbol) ?? 0;
  }

  const overlapPercentA = totalA > 0 ? bankersRound((sharedValueA / totalA) * 100, 2) : 0;
  const overlapPercentB = totalB > 0 ? bankersRound((sharedValueB / totalB) * 100, 2) : 0;
  const overlapPercentAvg = bankersRound((overlapPercentA + overlapPercentB) / 2, 2);

  // Unique holdings
  const uniqueToA = mapA.size - sharedSymbols.length;
  const uniqueToB = mapB.size - sharedSymbols.length;

  // Correlation estimate using minimum-weight overlap
  const correlationEstimate = estimateCorrelation(mapA, mapB, totalA, totalB);

  return {
    overlapPercentA,
    overlapPercentB,
    overlapPercentAvg,
    sharedSymbols,
    uniqueToA,
    uniqueToB,
    correlationEstimate,
  };
}

// ---------------------------------------------------------------------------
// Correlation Estimation
// ---------------------------------------------------------------------------

/**
 * Estimate correlation between two portfolios using the minimum-weight method.
 *
 * For each shared symbol, takes the minimum of the two portfolio weights.
 * The sum of these minimums is used as a correlation proxy (0–1).
 * When no holdings are shared, correlation is 0.
 *
 * @param mapA - Symbol-to-value map for portfolio A.
 * @param mapB - Symbol-to-value map for portfolio B.
 * @param totalA - Total value of portfolio A in cents.
 * @param totalB - Total value of portfolio B in cents.
 * @returns Estimated correlation coefficient (0–1).
 */
function estimateCorrelation(
  mapA: ReadonlyMap<string, number>,
  mapB: ReadonlyMap<string, number>,
  totalA: number,
  totalB: number,
): number {
  if (totalA === 0 || totalB === 0) return 0;

  let minWeightSum = 0;

  for (const [symbol, valueA] of mapA) {
    const valueB = mapB.get(symbol);
    if (valueB !== undefined) {
      const weightA = valueA / totalA;
      const weightB = valueB / totalB;
      minWeightSum += Math.min(weightA, weightB);
    }
  }

  return bankersRound(Math.min(minWeightSum, 1), 4);
}
