// SPDX-License-Identifier: BUSL-1.1

/**
 * Tax calculation types and enums.
 *
 * All monetary values are in cents (integers) to avoid floating-point errors.
 * This module defines the domain types for federal income tax, self-employment
 * tax, and quarterly estimated tax calculations.
 *
 * References: issue #1757
 */

/**
 * Filing status for federal income tax calculations.
 * Determines which tax bracket schedule to use.
 */
export enum FilingStatus {
  SINGLE = 'SINGLE',
  MARRIED_FILING_JOINTLY = 'MARRIED_FILING_JOINTLY',
  MARRIED_FILING_SEPARATELY = 'MARRIED_FILING_SEPARATELY',
  HEAD_OF_HOUSEHOLD = 'HEAD_OF_HOUSEHOLD',
}

/**
 * A single tax bracket with income threshold and marginal rate.
 */
export interface TaxBracket {
  /** Minimum taxable income for this bracket (cents). */
  readonly min: number;
  /** Maximum taxable income for this bracket (cents). */
  readonly max: number | null;
  /** Marginal tax rate as a decimal (0.10 = 10%). */
  readonly rate: number;
}

/**
 * Self-employment income and tax data.
 */
export interface SEIncome {
  /** Net self-employment income (cents). */
  readonly netIncome: number;
  /** Self-employment tax owed (cents). */
  readonly seTax: number;
  /** Deductible portion of SE tax (cents), 50% of total. */
  readonly seDeduction: number;
  /** Taxable base after 92.35% reduction (cents). */
  readonly taxableBase: number;
  /** Employer-equivalent SS tax (cents), paid as SE tax. */
  readonly ssContribution: number;
  /** Medicare tax (cents). */
  readonly medicareContribution: number;
}

/**
 * Quarterly estimated tax payment.
 */
export interface QuarterlyEstimate {
  /** Quarter number (1-4). */
  readonly quarter: number;
  /** Due date (ISO 8601 format, e.g., "2024-04-15"). */
  readonly dueDate: string;
  /** Estimated payment amount (cents). */
  readonly payment: number;
}

/**
 * Federal income tax calculation result.
 */
export interface FederalTaxResult {
  /** Gross income (cents). */
  readonly income: number;
  /** Standard deduction (cents). */
  readonly standardDeduction: number;
  /** Taxable income (cents). */
  readonly taxableIncome: number;
  /** Federal income tax owed (cents). */
  readonly incomeTax: number;
  /** Effective tax rate (0.15 = 15%). */
  readonly effectiveRate: number;
  /** Marginal tax rate (0.22 = 22%). */
  readonly marginalRate: number;
}

/**
 * Annual tax summary combining all tax types.
 */
export interface TaxSummary {
  /** Gross income (cents). */
  readonly grossIncome: number;
  /** Self-employment income (cents). */
  readonly seIncome: number;
  /** Self-employment tax (cents). */
  readonly seTax: number;
  /** Deductible portion of SE tax (cents). */
  readonly seDeduction: number;
  /** Adjusted gross income after SE deduction (cents). */
  readonly agi: number;
  /** Standard deduction (cents). */
  readonly standardDeduction: number;
  /** Taxable income (cents). */
  readonly taxableIncome: number;
  /** Federal income tax (cents). */
  readonly incomeTax: number;
  /** Total tax liability (income tax + SE tax, cents). */
  readonly totalTax: number;
  /** Effective tax rate on gross income. */
  readonly effectiveRate: number;
  /** Filing status used. */
  readonly filingStatus: FilingStatus;
}
