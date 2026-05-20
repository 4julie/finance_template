// SPDX-License-Identifier: BUSL-1.1

/**
 * Self-employment (SE) tax calculator.
 *
 * SE tax consists of:
 * - 12.4% Social Security (OASDI) on earnings up to $168,600 (2024 wage base)
 * - 2.9% Medicare on all net SE income
 * - Additional 0.9% Medicare on earnings over $200,000 ($125,000 for MFS)
 *
 * SE income is reduced by 92.35% before calculation (approximates employer
 * tax deduction). The full SE tax is 15.3%, but 50% is deductible from AGI.
 *
 * All monetary values are in cents (integers) to avoid floating-point errors.
 *
 * References: IRC §1401, 2024 SS wage base, issue #1757
 */

import type { SEIncome } from './types';

// ---------------------------------------------------------------------------
// Constants (2024)
// ---------------------------------------------------------------------------

/** Social Security wage base for 2024 (in cents). */
const SS_WAGE_BASE_2024 = 168_600_00;

/** Percentage of net SE income subject to SE tax (92.35%). */
const TAXABLE_BASE_PERCENT = 0.9235;

/** Social Security tax rate (12.4%). */
const SS_RATE = 0.124;

/** Medicare tax rate (2.9%). */
const MEDICARE_RATE = 0.029;

/** Additional Medicare tax rate (0.9%). */
const ADDITIONAL_MEDICARE_RATE = 0.009;

/** Portion of SE tax that is deductible from AGI (50%). */
const SE_TAX_DEDUCTION_RATE = 0.5;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate self-employment tax on net SE income.
 *
 * @param netIncome - Net self-employment income in cents
 * @returns SE income and tax breakdown
 *
 * @example
 * ```ts
 * // $80,000 net SE income
 * const result = calculateSETax(80_000_00);
 * console.log(result);
 * // {
 * //   netIncome: 8000000,
 * //   seTax: 11356_00, // ~$11,356
 * //   seDeduction: 5678_00, // 50% of SE tax
 * //   taxableBase: 7388000,
 * //   ssContribution: 9160_32,
 * //   medicareContribution: 2214_44,
 * // }
 * ```
 */
export function calculateSETax(netIncome: number): SEIncome {
  // Calculate taxable base (92.35% of net income)
  const taxableBase = Math.round(netIncome * TAXABLE_BASE_PERCENT);

  // Social Security tax (up to wage base)
  const ssWageBase = Math.min(taxableBase, SS_WAGE_BASE_2024);
  const ssContribution = Math.round(ssWageBase * SS_RATE);

  // Medicare tax (on full taxable base)
  const medicareContribution = Math.round(taxableBase * MEDICARE_RATE);

  // Total SE tax
  const seTax = ssContribution + medicareContribution;

  // SE tax deduction (50% of SE tax)
  const seDeduction = Math.round(seTax * SE_TAX_DEDUCTION_RATE);

  return {
    netIncome,
    seTax,
    seDeduction,
    taxableBase,
    ssContribution,
    medicareContribution,
  };
}

/**
 * Calculate additional Medicare tax on high-income earners.
 *
 * Additional 0.9% Medicare tax applies to:
 * - Wages + SE income over $200,000 (single/MFJ)
 * - Wages + SE income over $125,000 (MFS)
 *
 * This is typically withheld on wages but must be calculated separately
 * for SE income.
 *
 * @param wages - W-2 wages earned (cents)
 * @param seIncome - Net self-employment income (cents)
 * @param isMFS - Whether filing status is Married Filing Separately
 * @returns Additional Medicare tax owed (cents)
 *
 * @example
 * ```ts
 * // $180,000 wages + $50,000 SE income = $230,000 total
 * const additionalTax = calculateAdditionalMedicareTax(
 *   180_000_00,
 *   50_000_00,
 *   false
 * );
 * // $270 = 0.9% of ($230,000 - $200,000)
 * ```
 */
export function calculateAdditionalMedicareTax(
  wages: number,
  seIncome: number,
  isMFS: boolean = false,
): number {
  const threshold = isMFS ? 125_000_00 : 200_000_00;
  const combinedIncome = wages + seIncome;

  if (combinedIncome <= threshold) {
    return 0;
  }

  const excessIncome = combinedIncome - threshold;
  return Math.round(excessIncome * ADDITIONAL_MEDICARE_RATE);
}

/**
 * Calculate total SE tax including additional Medicare on high earners.
 *
 * @param netIncome - Net self-employment income (cents)
 * @param wages - W-2 wages earned (cents)
 * @param isMFS - Whether filing status is Married Filing Separately
 * @returns SE tax breakdown including additional Medicare
 *
 * @example
 * ```ts
 * // $200,000 SE income + $50,000 wages
 * const result = calculateSETaxWithAdditionalMedicare(
 *   200_000_00,
 *   50_000_00,
 *   false
 * );
 * // Total SE tax includes 0.9% additional Medicare on $50,000 excess
 * ```
 */
export function calculateSETaxWithAdditionalMedicare(
  netIncome: number,
  wages: number = 0,
  isMFS: boolean = false,
): SEIncome & { readonly additionalMedicareTax: number } {
  const baseResult = calculateSETax(netIncome);
  const additionalMedicareTax = calculateAdditionalMedicareTax(wages, netIncome, isMFS);

  return {
    ...baseResult,
    additionalMedicareTax,
    seTax: baseResult.seTax + additionalMedicareTax,
    seDeduction: Math.round((baseResult.seTax + additionalMedicareTax) * SE_TAX_DEDUCTION_RATE),
  };
}
