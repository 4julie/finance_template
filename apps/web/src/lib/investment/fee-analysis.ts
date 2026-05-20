// SPDX-License-Identifier: BUSL-1.1

/**
 * Investment fee analyzer and long-term fee-drag calculator.
 *
 * Calculates weighted expense ratios, total annual fees, and projects
 * the long-term impact of fees on portfolio growth. Supports "what if
 * lower fees" comparison scenarios.
 *
 * All monetary values are integer cents. Expense ratios are in basis
 * points (1 bp = 0.01%).
 *
 * References: issue #1625
 */

import type {
  FeeAnalysis,
  FeeComparisonScenario,
  FeeDragProjection,
  FundFeeInfo,
  PortfolioFeeSummary,
} from '../../types/investment';

// ---------------------------------------------------------------------------
// Fee summary computation
// ---------------------------------------------------------------------------

/** Input holding for fee analysis. */
export interface FeeHoldingInput {
  readonly investmentId: string;
  readonly symbol: string;
  readonly name: string;
  /** Expense ratio in basis points (e.g., 3 for 0.03%). */
  readonly expenseRatioBps: number;
  /** Current market value in cents. */
  readonly marketValue: number;
}

/**
 * Compute portfolio-level fee summary from individual holdings.
 *
 * @param holdings - Holdings with expense ratios and market values.
 * @returns Portfolio fee summary with per-fund breakdown.
 */
export function computeFeeSummary(holdings: readonly FeeHoldingInput[]): PortfolioFeeSummary {
  const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);

  const fundFees: FundFeeInfo[] = holdings.map((h) => {
    const annualFee = Math.round((h.marketValue * h.expenseRatioBps) / 10000);
    return {
      investmentId: h.investmentId,
      symbol: h.symbol,
      name: h.name,
      expenseRatioBps: h.expenseRatioBps,
      marketValue: h.marketValue,
      annualFee,
    };
  });

  const totalAnnualFees = fundFees.reduce((sum, f) => sum + f.annualFee, 0);

  // Weighted average expense ratio: Σ(value_i × er_i) / Σ(value_i)
  const weightedExpenseRatioBps =
    totalValue > 0
      ? Math.round(
          holdings.reduce((sum, h) => sum + h.marketValue * h.expenseRatioBps, 0) / totalValue,
        )
      : 0;

  // Sort by annual fee descending for display
  fundFees.sort((a, b) => b.annualFee - a.annualFee);

  return {
    totalValue,
    weightedExpenseRatioBps,
    totalAnnualFees,
    fundFees,
  };
}

// ---------------------------------------------------------------------------
// Fee drag projection
// ---------------------------------------------------------------------------

/**
 * Project portfolio growth with and without fees over a given number of years.
 *
 * Uses compound growth formula:
 *   - Without fees: V = P × (1 + r)^t
 *   - With fees: V = P × (1 + r - f)^t
 *
 * @param initialValueCents - Starting portfolio value in cents.
 * @param annualReturnPercent - Expected annual return as a percentage (e.g., 7 for 7%).
 * @param expenseRatioBps - Annual expense ratio in basis points.
 * @param years - Number of years to project.
 * @returns Fee drag projection for the given time horizon.
 */
export function projectFeeDrag(
  initialValueCents: number,
  annualReturnPercent: number,
  expenseRatioBps: number,
  years: number,
): FeeDragProjection {
  const annualReturn = annualReturnPercent / 100;
  const expenseRatio = expenseRatioBps / 10000;

  const valueWithoutFees = Math.round(initialValueCents * Math.pow(1 + annualReturn, years));
  const valueWithFees = Math.round(
    initialValueCents * Math.pow(1 + annualReturn - expenseRatio, years),
  );
  const totalFeesPaid = valueWithoutFees - valueWithFees;

  const growthWithoutFees = valueWithoutFees - initialValueCents;
  const feeDragPercent =
    growthWithoutFees > 0 ? Math.round((totalFeesPaid / growthWithoutFees) * 10000) / 100 : 0;

  return {
    years,
    valueWithoutFees,
    valueWithFees,
    totalFeesPaid,
    feeDragPercent,
  };
}

/**
 * Generate fee drag projections for standard time horizons (10, 20, 30 years).
 *
 * @param initialValueCents - Starting portfolio value in cents.
 * @param annualReturnPercent - Expected annual return percentage.
 * @param expenseRatioBps - Expense ratio in basis points.
 * @returns Projections at 10, 20, and 30 years.
 */
export function projectFeeDragMultiYear(
  initialValueCents: number,
  annualReturnPercent: number,
  expenseRatioBps: number,
): FeeDragProjection[] {
  return [10, 20, 30].map((years) =>
    projectFeeDrag(initialValueCents, annualReturnPercent, expenseRatioBps, years),
  );
}

// ---------------------------------------------------------------------------
// Fee comparison ("what if lower fees")
// ---------------------------------------------------------------------------

/** Default comparison scenarios for common low-cost alternatives. */
export const DEFAULT_FEE_COMPARISON_SCENARIOS: ReadonlyArray<{
  label: string;
  expenseRatioBps: number;
}> = [
  { label: 'Ultra Low Cost (0.03%)', expenseRatioBps: 3 },
  { label: 'Low Cost Index (0.10%)', expenseRatioBps: 10 },
  { label: 'Average Index Fund (0.20%)', expenseRatioBps: 20 },
];

/**
 * Generate comparison scenarios showing the impact of switching to lower-fee alternatives.
 *
 * @param initialValueCents - Starting portfolio value in cents.
 * @param annualReturnPercent - Expected annual return percentage.
 * @param scenarios - Array of alternative fee scenarios.
 * @returns Comparison scenarios with projections.
 */
export function generateFeeComparisons(
  initialValueCents: number,
  annualReturnPercent: number,
  scenarios: ReadonlyArray<{ label: string; expenseRatioBps: number }>,
): FeeComparisonScenario[] {
  return scenarios.map((scenario) => ({
    label: scenario.label,
    expenseRatioBps: scenario.expenseRatioBps,
    projections: projectFeeDragMultiYear(
      initialValueCents,
      annualReturnPercent,
      scenario.expenseRatioBps,
    ),
  }));
}

// ---------------------------------------------------------------------------
// Full analysis
// ---------------------------------------------------------------------------

/**
 * Run a comprehensive fee analysis for the portfolio.
 *
 * Combines fee summary, fee drag projections, and comparison scenarios.
 *
 * @param holdings - Holdings with expense ratios.
 * @param annualReturnPercent - Expected annual return (default: 7%).
 * @param comparisonScenarios - Alternative fee scenarios (defaults provided).
 * @returns Complete fee analysis result.
 */
export function analyzeFees(
  holdings: readonly FeeHoldingInput[],
  annualReturnPercent: number = 7,
  comparisonScenarios: ReadonlyArray<{
    label: string;
    expenseRatioBps: number;
  }> = DEFAULT_FEE_COMPARISON_SCENARIOS,
): FeeAnalysis {
  const summary = computeFeeSummary(holdings);

  const projections = projectFeeDragMultiYear(
    summary.totalValue,
    annualReturnPercent,
    summary.weightedExpenseRatioBps,
  );

  const comparisons = generateFeeComparisons(
    summary.totalValue,
    annualReturnPercent,
    comparisonScenarios,
  );

  return {
    summary,
    projections,
    comparisons,
  };
}

/**
 * Format basis points as a human-readable percentage string.
 *
 * @param bps - Expense ratio in basis points.
 * @returns Formatted string like "0.03%".
 */
export function formatExpenseRatio(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
