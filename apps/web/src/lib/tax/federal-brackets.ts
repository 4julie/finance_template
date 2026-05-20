// SPDX-License-Identifier: BUSL-1.1

/**
 * 2024 Federal income tax bracket calculator.
 *
 * Uses 2024 IRS tax schedules (Rev. Proc. 2023-34) for all filing statuses.
 * Brackets are defined in cents to avoid floating-point errors.
 *
 * All monetary values are in cents (integers).
 * Tax rates are decimals (0.10 = 10%).
 *
 * References: IRS Rev. Proc. 2023-34, issue #1757
 */

import { FilingStatus, type FederalTaxResult, type TaxBracket } from './types';

// ---------------------------------------------------------------------------
// 2024 Tax Brackets (IRS Rev. Proc. 2023-34)
// ---------------------------------------------------------------------------

/**
 * 2024 tax brackets for Single filers (in cents).
 */
const BRACKETS_SINGLE: readonly TaxBracket[] = [
  { min: 0, max: 11599_00, rate: 0.1 },
  { min: 11600_00, max: 47149_00, rate: 0.12 },
  { min: 47150_00, max: 100524_00, rate: 0.22 },
  { min: 100525_00, max: 191949_00, rate: 0.24 },
  { min: 191950_00, max: 243724_00, rate: 0.32 },
  { min: 243725_00, max: 609349_00, rate: 0.35 },
  { min: 609350_00, max: null, rate: 0.37 },
];

/**
 * 2024 tax brackets for Married Filing Jointly (in cents).
 */
const BRACKETS_MFJ: readonly TaxBracket[] = [
  { min: 0, max: 23199_00, rate: 0.1 },
  { min: 23200_00, max: 94299_00, rate: 0.12 },
  { min: 94300_00, max: 201049_00, rate: 0.22 },
  { min: 201050_00, max: 383899_00, rate: 0.24 },
  { min: 383900_00, max: 487449_00, rate: 0.32 },
  { min: 487450_00, max: 731199_00, rate: 0.35 },
  { min: 731200_00, max: null, rate: 0.37 },
];

/**
 * 2024 tax brackets for Married Filing Separately (in cents).
 */
const BRACKETS_MFS: readonly TaxBracket[] = [
  { min: 0, max: 11599_00, rate: 0.1 },
  { min: 11600_00, max: 47149_00, rate: 0.12 },
  { min: 47150_00, max: 100524_00, rate: 0.22 },
  { min: 100525_00, max: 191949_00, rate: 0.24 },
  { min: 191950_00, max: 243724_00, rate: 0.32 },
  { min: 243725_00, max: 365599_00, rate: 0.35 },
  { min: 365600_00, max: null, rate: 0.37 },
];

/**
 * 2024 tax brackets for Head of Household (in cents).
 */
const BRACKETS_HOH: readonly TaxBracket[] = [
  { min: 0, max: 17449_00, rate: 0.1 },
  { min: 17450_00, max: 66649_00, rate: 0.12 },
  { min: 66650_00, max: 117649_00, rate: 0.22 },
  { min: 117650_00, max: 191949_00, rate: 0.24 },
  { min: 191950_00, max: 243724_00, rate: 0.32 },
  { min: 243725_00, max: 609349_00, rate: 0.35 },
  { min: 609350_00, max: null, rate: 0.37 },
];

/**
 * 2024 standard deductions by filing status (in cents).
 */
const STANDARD_DEDUCTIONS: Record<FilingStatus, number> = {
  [FilingStatus.SINGLE]: 14600_00,
  [FilingStatus.MARRIED_FILING_JOINTLY]: 29200_00,
  [FilingStatus.MARRIED_FILING_SEPARATELY]: 14600_00,
  [FilingStatus.HEAD_OF_HOUSEHOLD]: 21900_00,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the tax bracket schedule for a filing status.
 */
export function getTaxBrackets(status: FilingStatus): readonly TaxBracket[] {
  switch (status) {
    case FilingStatus.SINGLE:
      return BRACKETS_SINGLE;
    case FilingStatus.MARRIED_FILING_JOINTLY:
      return BRACKETS_MFJ;
    case FilingStatus.MARRIED_FILING_SEPARATELY:
      return BRACKETS_MFS;
    case FilingStatus.HEAD_OF_HOUSEHOLD:
      return BRACKETS_HOH;
  }
}

/**
 * Get the 2024 standard deduction for a filing status (in cents).
 */
export function getStandardDeduction(status: FilingStatus): number {
  return STANDARD_DEDUCTIONS[status];
}

/**
 * Calculate federal income tax using progressive bracket method.
 *
 * @param taxableIncome - Taxable income in cents
 * @param brackets - Tax bracket schedule
 * @returns Total tax owed in cents
 *
 * @example
 * ```ts
 * // $100,000 taxable income, single filer
 * const brackets = getTaxBrackets(FilingStatus.SINGLE);
 * const tax = calculateProgressiveTax(100_000_00, brackets);
 * // => 13,206_00 ($13,206.00)
 * ```
 */
export function calculateProgressiveTax(
  taxableIncome: number,
  brackets: readonly TaxBracket[],
): number {
  let tax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= 0) break;

    const bracketMin = bracket.min;
    const bracketMax = bracket.max ?? Number.MAX_SAFE_INTEGER;
    const taxableInThisBracket = Math.min(taxableIncome, bracketMax - bracketMin);

    tax += Math.round(taxableInThisBracket * bracket.rate);
    taxableIncome -= taxableInThisBracket;
  }

  return tax;
}

/**
 * Calculate the marginal tax rate for a given taxable income.
 *
 * @param taxableIncome - Taxable income in cents
 * @param brackets - Tax bracket schedule
 * @returns Marginal rate as a decimal (0.22 = 22%)
 */
export function getMarginalRate(taxableIncome: number, brackets: readonly TaxBracket[]): number {
  for (const bracket of brackets) {
    const max = bracket.max ?? Number.MAX_SAFE_INTEGER;
    if (taxableIncome <= max) {
      return bracket.rate;
    }
  }
  return brackets[brackets.length - 1].rate;
}

/**
 * Calculate comprehensive federal income tax with all metrics.
 *
 * @param grossIncome - Total income in cents
 * @param filingStatus - Filing status determining brackets and deduction
 * @returns Complete tax calculation result
 *
 * @example
 * ```ts
 * const result = calculateFederalTax(100_000_00, FilingStatus.SINGLE);
 * console.log(result);
 * // {
 * //   income: 10000000,
 * //   standardDeduction: 1460000,
 * //   taxableIncome: 8540000,
 * //   incomeTax: 1103_46, // $11.03 approximately
 * //   effectiveRate: 0.1103,
 * //   marginalRate: 0.22
 * // }
 * ```
 */
export function calculateFederalTax(
  grossIncome: number,
  filingStatus: FilingStatus,
): FederalTaxResult {
  const standardDeduction = getStandardDeduction(filingStatus);
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  const brackets = getTaxBrackets(filingStatus);
  const incomeTax = calculateProgressiveTax(taxableIncome, brackets);
  const effectiveRate = grossIncome > 0 ? incomeTax / grossIncome : 0;
  const marginalRate = getMarginalRate(taxableIncome, brackets);

  return {
    income: grossIncome,
    standardDeduction,
    taxableIncome,
    incomeTax,
    effectiveRate,
    marginalRate,
  };
}
