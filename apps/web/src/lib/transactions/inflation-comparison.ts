// SPDX-License-Identifier: BUSL-1.1

/**
 * Inflation-adjusted year-over-year category comparison engine.
 *
 * Compares spending by category across years, adjusting for inflation
 * using CPI data. Calculates real vs nominal spending changes and
 * provides inflation rate helpers.
 *
 * All monetary values are in integer cents. All functions are pure.
 * Uses banker's rounding (HALF_EVEN) for divisions.
 *
 * References: issue #1582
 */

import { bankersRound } from './review-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** CPI data point for a specific period. */
export interface CpiDataPoint {
  /** The period (e.g., "2024" for annual, "2024-06" for monthly). */
  readonly period: string;
  /** The CPI index value (e.g., 308.417). Stored as a number (not cents). */
  readonly cpiIndex: number;
}

/** Category spending for a specific year. */
export interface CategoryYearSpend {
  /** Category identifier. */
  readonly categoryId: string;
  /** Category display name. */
  readonly categoryName: string;
  /** The year. */
  readonly year: number;
  /** Total nominal spending in cents. */
  readonly nominalCents: number;
}

/** Year-over-year comparison for a single category. */
export interface CategoryComparison {
  /** Category identifier. */
  readonly categoryId: string;
  /** Category display name. */
  readonly categoryName: string;
  /** Base year (earlier). */
  readonly baseYear: number;
  /** Comparison year (later). */
  readonly comparisonYear: number;
  /** Nominal spending in the base year (cents). */
  readonly baseNominalCents: number;
  /** Nominal spending in the comparison year (cents). */
  readonly comparisonNominalCents: number;
  /** Base year spending adjusted to comparison-year dollars (cents). */
  readonly baseAdjustedCents: number;
  /** Nominal change in cents (comparison - base). */
  readonly nominalChangeCents: number;
  /** Nominal change as a percentage. 0 when base is 0. */
  readonly nominalChangePercent: number;
  /** Real change in cents (comparison - base adjusted for inflation). */
  readonly realChangeCents: number;
  /** Real change as a percentage. 0 when adjusted base is 0. */
  readonly realChangePercent: number;
  /** The inflation rate used for adjustment (as a percentage). */
  readonly inflationRatePercent: number;
}

/** Summary of all category comparisons between two years. */
export interface YearOverYearSummary {
  /** Base year. */
  readonly baseYear: number;
  /** Comparison year. */
  readonly comparisonYear: number;
  /** Inflation rate between the two years (percentage). */
  readonly inflationRatePercent: number;
  /** Per-category comparisons. */
  readonly categories: readonly CategoryComparison[];
  /** Total nominal spending in base year (cents). */
  readonly totalBaseNominalCents: number;
  /** Total nominal spending in comparison year (cents). */
  readonly totalComparisonNominalCents: number;
  /** Total real change (cents). */
  readonly totalRealChangeCents: number;
}

// ---------------------------------------------------------------------------
// Inflation rate helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the inflation rate between two CPI values.
 *
 * @param baseCpi - CPI index for the base period.
 * @param comparisonCpi - CPI index for the comparison period.
 * @returns Inflation rate as a percentage (e.g., 3.5 for 3.5%). Returns 0
 *          when baseCpi is 0 to guard against division by zero.
 */
export function calculateInflationRate(baseCpi: number, comparisonCpi: number): number {
  if (baseCpi === 0) return 0;
  return bankersRound(((comparisonCpi - baseCpi) / baseCpi) * 10000) / 100;
}

/**
 * Adjust a monetary amount from one period's dollars to another using CPI.
 *
 * Converts `amountCents` from base-period purchasing power to
 * comparison-period purchasing power.
 *
 * @param amountCents - The amount to adjust (in cents).
 * @param baseCpi - CPI index of the period the amount is denominated in.
 * @param comparisonCpi - CPI index of the target period.
 * @returns The inflation-adjusted amount in cents (banker's rounded).
 *          Returns the original amount when baseCpi is 0.
 */
export function adjustForInflation(
  amountCents: number,
  baseCpi: number,
  comparisonCpi: number,
): number {
  if (baseCpi === 0) return amountCents;
  return bankersRound((amountCents * comparisonCpi) / baseCpi);
}

/**
 * Look up the CPI value for a given year from a dataset.
 *
 * @param cpiData - Array of CPI data points.
 * @param year - The year to look up.
 * @returns The CPI index value, or null if not found.
 */
export function lookupCpi(cpiData: readonly CpiDataPoint[], year: number): number | null {
  const yearStr = String(year);
  const point = cpiData.find((d) => d.period === yearStr);
  return point ? point.cpiIndex : null;
}

// ---------------------------------------------------------------------------
// Category comparison
// ---------------------------------------------------------------------------

/**
 * Compare a single category's spending between two years, adjusted for inflation.
 *
 * @param baseSpend - The category's spending in the base year.
 * @param comparisonSpend - The category's spending in the comparison year.
 * @param baseCpi - CPI index for the base year.
 * @param comparisonCpi - CPI index for the comparison year.
 * @returns A category comparison with nominal and real changes.
 */
export function compareCategoryYoY(
  baseSpend: CategoryYearSpend,
  comparisonSpend: CategoryYearSpend,
  baseCpi: number,
  comparisonCpi: number,
): CategoryComparison {
  const baseAdjustedCents = adjustForInflation(baseSpend.nominalCents, baseCpi, comparisonCpi);
  const nominalChangeCents = comparisonSpend.nominalCents - baseSpend.nominalCents;
  const realChangeCents = comparisonSpend.nominalCents - baseAdjustedCents;

  const nominalChangePercent =
    baseSpend.nominalCents !== 0
      ? bankersRound((nominalChangeCents / baseSpend.nominalCents) * 10000) / 100
      : 0;

  const realChangePercent =
    baseAdjustedCents !== 0 ? bankersRound((realChangeCents / baseAdjustedCents) * 10000) / 100 : 0;

  const inflationRatePercent = calculateInflationRate(baseCpi, comparisonCpi);

  return {
    categoryId: baseSpend.categoryId,
    categoryName: baseSpend.categoryName,
    baseYear: baseSpend.year,
    comparisonYear: comparisonSpend.year,
    baseNominalCents: baseSpend.nominalCents,
    comparisonNominalCents: comparisonSpend.nominalCents,
    baseAdjustedCents,
    nominalChangeCents,
    nominalChangePercent,
    realChangeCents,
    realChangePercent,
    inflationRatePercent,
  };
}

/**
 * Build a year-over-year summary comparing all categories between two years.
 *
 * Categories present in only one year are included with 0 for the missing year.
 *
 * @param spends - All category-year spending records.
 * @param baseYear - The base year for comparison.
 * @param comparisonYear - The comparison year.
 * @param baseCpi - CPI index for the base year.
 * @param comparisonCpi - CPI index for the comparison year.
 * @returns A complete year-over-year summary with inflation-adjusted comparisons.
 */
export function buildYearOverYearSummary(
  spends: readonly CategoryYearSpend[],
  baseYear: number,
  comparisonYear: number,
  baseCpi: number,
  comparisonCpi: number,
): YearOverYearSummary {
  // Group spends by categoryId and year
  const baseMap = new Map<string, CategoryYearSpend>();
  const compMap = new Map<string, CategoryYearSpend>();
  const nameMap = new Map<string, string>();

  for (const spend of spends) {
    nameMap.set(spend.categoryId, spend.categoryName);
    if (spend.year === baseYear) {
      baseMap.set(spend.categoryId, spend);
    } else if (spend.year === comparisonYear) {
      compMap.set(spend.categoryId, spend);
    }
  }

  // Collect all category IDs
  const allCategoryIds = new Set([...baseMap.keys(), ...compMap.keys()]);

  const categories: CategoryComparison[] = [];
  let totalBaseNominal = 0;
  let totalCompNominal = 0;
  let totalRealChange = 0;

  for (const catId of allCategoryIds) {
    const catName = nameMap.get(catId) ?? catId;
    const base: CategoryYearSpend = baseMap.get(catId) ?? {
      categoryId: catId,
      categoryName: catName,
      year: baseYear,
      nominalCents: 0,
    };
    const comp: CategoryYearSpend = compMap.get(catId) ?? {
      categoryId: catId,
      categoryName: catName,
      year: comparisonYear,
      nominalCents: 0,
    };

    const comparison = compareCategoryYoY(base, comp, baseCpi, comparisonCpi);
    categories.push(comparison);

    totalBaseNominal += base.nominalCents;
    totalCompNominal += comp.nominalCents;
    totalRealChange += comparison.realChangeCents;
  }

  return {
    baseYear,
    comparisonYear,
    inflationRatePercent: calculateInflationRate(baseCpi, comparisonCpi),
    categories,
    totalBaseNominalCents: totalBaseNominal,
    totalComparisonNominalCents: totalCompNominal,
    totalRealChangeCents: totalRealChange,
  };
}
