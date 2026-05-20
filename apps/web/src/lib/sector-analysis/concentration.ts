// SPDX-License-Identifier: BUSL-1.1

/**
 * Portfolio concentration analysis engine.
 *
 * Computes the Herfindahl-Hirschman Index (HHI), top-N concentration,
 * and sector weight comparisons against a benchmark.
 *
 * All monetary values are integer cents. Percentages are 0–100.
 * Uses Banker's rounding (HALF_EVEN) for financial divisions.
 *
 * References: issue #1603
 */

import {
  ConcentrationLevel,
  type ConcentrationResult,
  type GicsSector,
  type HoldingExposure,
  type SectorWeight,
  type TopHolding,
} from './types';

// ---------------------------------------------------------------------------
// Banker's rounding helper
// ---------------------------------------------------------------------------

/**
 * Round a number using Banker's rounding (round half to even).
 *
 * @param value - The value to round.
 * @param decimals - Number of decimal places (default: 2).
 * @returns The rounded value.
 */
export function bankersRound(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  const floored = Math.floor(shifted);
  const diff = shifted - floored;

  if (Math.abs(diff - 0.5) < 1e-10) {
    // Exactly 0.5 — round to even
    return floored % 2 === 0 ? floored / factor : (floored + 1) / factor;
  }
  return Math.round(shifted) / factor;
}

// ---------------------------------------------------------------------------
// HHI Calculation
// ---------------------------------------------------------------------------

/**
 * Classify the concentration level based on HHI value.
 *
 * @param hhi - Herfindahl-Hirschman Index value (0–10000).
 * @returns The concentration level category.
 */
export function classifyConcentration(hhi: number): ConcentrationLevel {
  if (hhi > 2500) return ConcentrationLevel.HIGH;
  if (hhi >= 1500) return ConcentrationLevel.MODERATE;
  return ConcentrationLevel.LOW;
}

/**
 * Calculate the Herfindahl-Hirschman Index (HHI) for a set of holdings.
 *
 * HHI = Σ(weight_i²) where each weight is a percentage 0–100.
 * Result ranges from near 0 (perfectly diversified) to 10000 (single holding).
 *
 * @param holdings - Array of holdings with market values in cents.
 * @returns HHI value rounded to 2 decimal places using Banker's rounding.
 */
export function calculateHHI(holdings: readonly { readonly marketValue: number }[]): number {
  if (holdings.length === 0) return 0;

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  if (totalValue === 0) return 0;

  const hhi = holdings.reduce((sum, h) => {
    const weight = (h.marketValue / totalValue) * 100;
    return sum + weight * weight;
  }, 0);

  return bankersRound(hhi, 2);
}

// ---------------------------------------------------------------------------
// Top-N Concentration
// ---------------------------------------------------------------------------

/**
 * Get the top-N holdings by portfolio weight with cumulative percentage.
 *
 * @param holdings - Array of holding exposures.
 * @param n - Number of top holdings to return (default: 10).
 * @returns Object with top holdings and their cumulative weight.
 */
export function getTopNHoldings(
  holdings: readonly HoldingExposure[],
  n: number = 10,
): { topHoldings: readonly TopHolding[]; topNPercent: number } {
  if (holdings.length === 0) {
    return { topHoldings: [], topNPercent: 0 };
  }

  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const top = sorted.slice(0, n);

  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  const topHoldings: TopHolding[] = top.map((h) => ({
    symbol: h.symbol,
    name: h.name,
    marketValue: h.marketValue,
    weightPercent: totalValue > 0 ? bankersRound((h.marketValue / totalValue) * 100, 2) : 0,
  }));

  const topValue = top.reduce((sum, h) => sum + h.marketValue, 0);
  const topNPercent = totalValue > 0 ? bankersRound((topValue / totalValue) * 100, 2) : 0;

  return { topHoldings, topNPercent };
}

// ---------------------------------------------------------------------------
// Full Concentration Analysis
// ---------------------------------------------------------------------------

/**
 * Perform a full concentration analysis on a portfolio.
 *
 * Computes HHI, classifies concentration level, and identifies top-N holdings.
 *
 * @param holdings - Array of holding exposures.
 * @param topN - Number of top holdings to include (default: 10).
 * @returns Complete concentration analysis result.
 */
export function analyzeConcentration(
  holdings: readonly HoldingExposure[],
  topN: number = 10,
): ConcentrationResult {
  const hhi = calculateHHI(holdings);
  const level = classifyConcentration(hhi);
  const { topHoldings, topNPercent } = getTopNHoldings(holdings, topN);

  return {
    hhi,
    level,
    topHoldings,
    topNPercent,
    totalHoldings: holdings.length,
  };
}

// ---------------------------------------------------------------------------
// Sector Weight Comparison
// ---------------------------------------------------------------------------

/**
 * Compare portfolio sector weights against a benchmark.
 *
 * @param holdings - Portfolio holdings with sector assignments.
 * @param benchmark - Benchmark sector weights as a map of sector to percentage (0–100).
 * @returns Array of sector weight comparisons sorted by absolute deviation (descending).
 */
export function compareSectorWeights(
  holdings: readonly HoldingExposure[],
  benchmark: Readonly<Partial<Record<GicsSector, number>>>,
): readonly SectorWeight[] {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  // Aggregate portfolio weights by sector
  const sectorValues = new Map<GicsSector, number>();
  for (const h of holdings) {
    const current = sectorValues.get(h.sector) ?? 0;
    sectorValues.set(h.sector, current + h.marketValue);
  }

  // Collect all sectors from both portfolio and benchmark
  const allSectors = new Set<GicsSector>([
    ...sectorValues.keys(),
    ...(Object.keys(benchmark) as GicsSector[]),
  ]);

  const results: SectorWeight[] = [];

  for (const sector of allSectors) {
    const sectorValue = sectorValues.get(sector) ?? 0;
    const portfolioPercent = totalValue > 0 ? bankersRound((sectorValue / totalValue) * 100, 2) : 0;
    const benchmarkPercent = benchmark[sector] ?? 0;
    const deviationPercent = bankersRound(portfolioPercent - benchmarkPercent, 2);

    results.push({
      sector,
      portfolioPercent,
      benchmarkPercent,
      deviationPercent,
    });
  }

  // Sort by absolute deviation descending
  results.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));

  return results;
}
