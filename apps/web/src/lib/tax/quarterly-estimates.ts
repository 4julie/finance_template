// SPDX-License-Identifier: BUSL-1.1

/**
 * Quarterly estimated tax calculator.
 *
 * Quarterly estimates are required when expected tax liability exceeds
 * $1,000. Payments are due on:
 * - Q1: April 15
 * - Q2: June 15
 * - Q3: September 15
 * - Q4: January 15 (next year)
 *
 * Safe harbor rules prevent underpayment penalties:
 * - 100% of prior year tax (if prior AGI ≤ $150,000)
 * - 110% of prior year tax (if prior AGI > $150,000)
 *
 * All monetary values are in cents (integers).
 *
 * References: IRC §6654, issue #1757, issue #1705
 */

import type { QuarterlyEstimate } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum quarterly payment threshold (in cents). */
const QUARTERLY_THRESHOLD = 100_000; // $1,000

/** Prior year safe harbor: 100% (when AGI ≤ $150,000). */
const SAFE_HARBOR_RATE_LOW = 1.0;

/** Prior year safe harbor: 110% (when AGI > $150,000). */
const SAFE_HARBOR_RATE_HIGH = 1.1;

/** AGI threshold for safe harbor determination. */
const AGI_SAFE_HARBOR_THRESHOLD = 150_000_00;

/** Quarterly due dates. */
const QUARTER_DUE_DATES = {
  1: '04-15',
  2: '06-15',
  3: '09-15',
  4: '01-15',
} as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate equal quarterly estimated tax payments from annual tax liability.
 *
 * Divides annual tax by 4 for simplicity. More sophisticated approaches
 * would allow varying payments based on seasonal income patterns.
 *
 * @param annualTax - Estimated annual tax liability (cents)
 * @param year - Tax year (used for Q4 date only)
 * @returns Array of quarterly payments with due dates
 *
 * @example
 * ```ts
 * // $20,000 annual tax -> $5,000 per quarter
 * const quarters = calculateQuarterlyEstimates(20_000_00, 2024);
 * console.log(quarters);
 * // [
 * //   { quarter: 1, dueDate: '2024-04-15', payment: 5000_00 },
 * //   { quarter: 2, dueDate: '2024-06-15', payment: 5000_00 },
 * //   { quarter: 3, dueDate: '2024-09-15', payment: 5000_00 },
 * //   { quarter: 4, dueDate: '2025-01-15', payment: 5000_00 },
 * // ]
 * ```
 */
export function calculateQuarterlyEstimates(annualTax: number, year: number): QuarterlyEstimate[] {
  const quarterlyPayment = Math.round(annualTax / 4);

  return [
    {
      quarter: 1,
      dueDate: `${year}-${QUARTER_DUE_DATES[1]}`,
      payment: quarterlyPayment,
    },
    {
      quarter: 2,
      dueDate: `${year}-${QUARTER_DUE_DATES[2]}`,
      payment: quarterlyPayment,
    },
    {
      quarter: 3,
      dueDate: `${year}-${QUARTER_DUE_DATES[3]}`,
      payment: quarterlyPayment,
    },
    {
      quarter: 4,
      dueDate: `${year + 1}-${QUARTER_DUE_DATES[4]}`,
      payment: quarterlyPayment,
    },
  ];
}

/**
 * Calculate safe harbor quarterly estimated tax based on prior year taxes.
 *
 * The safe harbor prevents underpayment penalties if current quarterly
 * payments meet 100% (or 110% for higher AGIs) of the prior year's tax.
 *
 * @param priorYearTax - Total tax from prior year (cents)
 * @param priorYearAGI - Adjusted gross income from prior year (cents)
 * @param year - Tax year for which estimates apply
 * @returns Array of quarterly payments using safe harbor method
 *
 * @example
 * ```ts
 * // Prior year: $15,000 tax, $100,000 AGI (low AGI, use 100%)
 * const quarters = calculateSafeHarborEstimates(
 *   15_000_00,
 *   100_000_00,
 *   2024
 * );
 * // Each quarter: $3,750 (= $15,000 / 4)
 *
 * // Prior year: $15,000 tax, $200,000 AGI (high AGI, use 110%)
 * const quartersHigh = calculateSafeHarborEstimates(
 *   15_000_00,
 *   200_000_00,
 *   2024
 * );
 * // Each quarter: $4,125 (= $15,000 * 1.10 / 4)
 * ```
 */
export function calculateSafeHarborEstimates(
  priorYearTax: number,
  priorYearAGI: number,
  year: number,
): QuarterlyEstimate[] {
  const safeHarborRate =
    priorYearAGI > AGI_SAFE_HARBOR_THRESHOLD ? SAFE_HARBOR_RATE_HIGH : SAFE_HARBOR_RATE_LOW;

  const safeHarborTax = Math.round(priorYearTax * safeHarborRate);
  const quarterlyPayment = Math.round(safeHarborTax / 4);

  return [
    {
      quarter: 1,
      dueDate: `${year}-${QUARTER_DUE_DATES[1]}`,
      payment: quarterlyPayment,
    },
    {
      quarter: 2,
      dueDate: `${year}-${QUARTER_DUE_DATES[2]}`,
      payment: quarterlyPayment,
    },
    {
      quarter: 3,
      dueDate: `${year}-${QUARTER_DUE_DATES[3]}`,
      payment: quarterlyPayment,
    },
    {
      quarter: 4,
      dueDate: `${year + 1}-${QUARTER_DUE_DATES[4]}`,
      payment: quarterlyPayment,
    },
  ];
}

/**
 * Calculate underpayment penalty amount.
 *
 * Penalty accrues daily on the shortfall between required and actual
 * payments. This is a simplified calculation assuming uniform payment
 * throughout the quarter.
 *
 * Penalty rate varies quarterly (approximately 8% annually, adjusted each
 * quarter). This function uses an approximate rate of 8% for simplicity.
 *
 * @param requiredPayment - Total required payments for the year (cents)
 * @param actualPayment - Total payments actually made (cents)
 * @param daysOfShortfall - Approximate number of days the shortfall persisted
 * @returns Estimated underpayment penalty (cents)
 *
 * @example
 * ```ts
 * // Required $4,000/quarter, paid $3,000/quarter (shortfall = $4,000)
 * // Penalty on $4,000 for 365 days at ~8% annual rate
 * const penalty = calculateUnderpaymentPenalty(
 *   16_000_00, // $4,000 * 4 quarters
 *   12_000_00, // $3,000 * 4 quarters
 *   365
 * );
 * // ≈ $320 (8% of $4,000 shortfall)
 * ```
 */
export function calculateUnderpaymentPenalty(
  requiredPayment: number,
  actualPayment: number,
  daysOfShortfall: number = 365,
): number {
  if (actualPayment >= requiredPayment) {
    return 0;
  }

  const shortfall = requiredPayment - actualPayment;
  const annualRate = 0.08; // Approximately 8% annual rate
  const dailyRate = annualRate / 365;
  const penalty = Math.round(shortfall * dailyRate * daysOfShortfall);

  return penalty;
}

/**
 * Determine if quarterly estimates are required.
 *
 * Estimates are required if expected tax liability exceeds $1,000.
 *
 * @param projectedTax - Projected annual tax liability (cents)
 * @returns true if quarterly estimates should be filed
 *
 * @example
 * ```ts
 * // $900 projected tax -> not required
 * isQuarterlyRequired(90_000); // false
 *
 * // $1,100 projected tax -> required
 * isQuarterlyRequired(110_000); // true
 * ```
 */
export function isQuarterlyRequired(projectedTax: number): boolean {
  return projectedTax > QUARTERLY_THRESHOLD;
}

/**
 * Get the due date for a specific quarter.
 *
 * @param quarter - Quarter number (1-4)
 * @param year - Tax year (used for Q4, which is due in the following year)
 * @returns Due date in ISO 8601 format (YYYY-MM-DD)
 *
 * @example
 * ```ts
 * getQuarterlyDueDate(1, 2024); // '2024-04-15'
 * getQuarterlyDueDate(4, 2024); // '2025-01-15'
 * ```
 */
export function getQuarterlyDueDate(quarter: number, year: number): string {
  if (quarter < 1 || quarter > 4) {
    throw new Error(`Invalid quarter: ${quarter}. Must be 1-4.`);
  }

  const dateStr = QUARTER_DUE_DATES[quarter as 1 | 2 | 3 | 4];
  if (quarter === 4) {
    return `${year + 1}-${dateStr}`;
  }
  return `${year}-${dateStr}`;
}
