// ---------------------------------------------------------------------------
// Expense Separation Engine (#1700)
// Business, personal, and split-expense classification, reporting, and
// allocation (mileage / home-office).
// All monetary values in integer cents. Banker's rounding for divisions.
// ---------------------------------------------------------------------------

import type {
  AllocationConfig,
  BusinessExpenseReport,
  ClassifiedTransaction,
  ExpenseType,
  Quarter,
  QuarterlyBusinessSummary,
  SplitRatio,
  Transaction,
} from './types';
import { bankersRound } from './bulk-operations';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Derive the business-portion amount for a transaction in cents.
 *
 * @param amountCents - Total transaction amount in cents.
 * @param expenseType - The expense type classification.
 * @param splitRatio - Required when `expenseType` is `'split'`.
 * @returns Business portion in cents (banker's-rounded).
 */
export function businessPortion(
  amountCents: number,
  expenseType: ExpenseType,
  splitRatio?: SplitRatio,
): number {
  if (expenseType === 'personal') return 0;
  if (expenseType === 'business') return amountCents;
  if (!splitRatio || splitRatio.businessPercent === 0) return 0;
  return bankersRound((amountCents * splitRatio.businessPercent) / 100);
}

/**
 * Derive the personal-portion amount for a transaction in cents.
 *
 * @param amountCents - Total transaction amount in cents.
 * @param expenseType - The expense type classification.
 * @param splitRatio - Required when `expenseType` is `'split'`.
 * @returns Personal portion in cents (banker's-rounded).
 */
export function personalPortion(
  amountCents: number,
  expenseType: ExpenseType,
  splitRatio?: SplitRatio,
): number {
  if (expenseType === 'business') return 0;
  if (expenseType === 'personal') return amountCents;
  if (!splitRatio || splitRatio.personalPercent === 0) return 0;
  return bankersRound((amountCents * splitRatio.personalPercent) / 100);
}

/**
 * Determine the quarter for a given ISO-8601 date string.
 *
 * @param dateStr - An ISO-8601 date string (YYYY-MM-DD).
 * @returns The quarter label.
 */
export function quarterFromDate(dateStr: string): Quarter {
  const month = parseInt(dateStr.slice(5, 7), 10);
  if (month <= 3) return 'Q1';
  if (month <= 6) return 'Q2';
  if (month <= 9) return 'Q3';
  return 'Q4';
}

/**
 * Derive the year from an ISO-8601 date string.
 *
 * @param dateStr - An ISO-8601 date string.
 * @returns The four-digit year.
 */
export function yearFromDate(dateStr: string): number {
  return parseInt(dateStr.slice(0, 4), 10);
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Classify a transaction as business, personal, or split.
 *
 * @param tx - The transaction.
 * @param expenseType - The classification to assign.
 * @param splitRatio - Required if `expenseType` is `'split'`.
 * @param isDeductible - Whether the expense is tax-deductible.
 * @param deductionCategory - Optional tax deduction category.
 * @returns A classified transaction record.
 */
export function classifyTransaction(
  tx: Transaction,
  expenseType: ExpenseType,
  splitRatio?: SplitRatio,
  isDeductible: boolean = false,
  deductionCategory?: string,
): ClassifiedTransaction {
  if (
    expenseType === 'split' &&
    splitRatio &&
    splitRatio.businessPercent + splitRatio.personalPercent !== 100
  ) {
    throw new Error(
      `Split ratio must sum to 100, got ${splitRatio.businessPercent + splitRatio.personalPercent}`,
    );
  }
  return {
    transaction: tx,
    expenseType,
    splitRatio: expenseType === 'split' ? splitRatio : undefined,
    isDeductible,
    deductionCategory,
  };
}

/**
 * Generate a business expense report for a date range.
 *
 * @param classified - All classified transactions.
 * @param periodStart - ISO-8601 start date (inclusive).
 * @param periodEnd - ISO-8601 end date (inclusive).
 * @returns Business expense report.
 */
export function generateBusinessExpenseReport(
  classified: readonly ClassifiedTransaction[],
  periodStart: string,
  periodEnd: string,
): BusinessExpenseReport {
  const inRange = classified.filter(
    (c) =>
      c.transaction.date >= periodStart &&
      c.transaction.date <= periodEnd &&
      c.expenseType !== 'personal',
  );

  let totalBusinessCents = 0;
  let totalDeductibleCents = 0;
  let totalSplitBusinessPortionCents = 0;
  const categoryMap = new Map<string, number>();

  for (const c of inRange) {
    const biz = businessPortion(c.transaction.amountCents, c.expenseType, c.splitRatio);
    totalBusinessCents += biz;
    if (c.isDeductible) totalDeductibleCents += biz;
    if (c.expenseType === 'split') totalSplitBusinessPortionCents += biz;

    const cat = c.transaction.category;
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + biz);
  }

  return {
    periodStart,
    periodEnd,
    totalBusinessCents,
    totalDeductibleCents,
    totalSplitBusinessPortionCents,
    transactions: inRange,
    categoryBreakdown: categoryMap,
  };
}

/**
 * Identify tax-deductible business expenses.
 *
 * @param classified - All classified transactions.
 * @returns Only the deductible classified transactions.
 */
export function taxDeductibleExpenses(
  classified: readonly ClassifiedTransaction[],
): readonly ClassifiedTransaction[] {
  return classified.filter((c) => c.isDeductible && c.expenseType !== 'personal');
}

/**
 * Generate quarterly business expense summaries for a given year.
 *
 * @param classified - All classified transactions.
 * @param year - The four-digit year.
 * @returns Array of quarterly summaries (Q1–Q4).
 */
export function quarterlyBusinessSummary(
  classified: readonly ClassifiedTransaction[],
  year: number,
): readonly QuarterlyBusinessSummary[] {
  const quarters: Quarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  return quarters.map((quarter) => {
    const qStart = quarterStartMonth(quarter);
    const qEnd = quarterEndMonth(quarter);

    const inQuarter = classified.filter((c) => {
      const txYear = yearFromDate(c.transaction.date);
      const txMonth = parseInt(c.transaction.date.slice(5, 7), 10);
      return (
        txYear === year && txMonth >= qStart && txMonth <= qEnd && c.expenseType !== 'personal'
      );
    });

    let totalBusinessCents = 0;
    let totalDeductibleCents = 0;
    const categoryMap = new Map<string, number>();

    for (const c of inQuarter) {
      const biz = businessPortion(c.transaction.amountCents, c.expenseType, c.splitRatio);
      totalBusinessCents += biz;
      if (c.isDeductible) totalDeductibleCents += biz;
      const cat = c.transaction.category;
      categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + biz);
    }

    return {
      quarter,
      year,
      totalBusinessCents,
      totalDeductibleCents,
      categoryBreakdown: categoryMap,
    };
  });
}

function quarterStartMonth(q: Quarter): number {
  switch (q) {
    case 'Q1':
      return 1;
    case 'Q2':
      return 4;
    case 'Q3':
      return 7;
    case 'Q4':
      return 10;
  }
}

function quarterEndMonth(q: Quarter): number {
  switch (q) {
    case 'Q1':
      return 3;
    case 'Q2':
      return 6;
    case 'Q3':
      return 9;
    case 'Q4':
      return 12;
  }
}

/**
 * Calculate mileage or home-office allocation.
 *
 * @param config - The allocation configuration.
 * @returns Deductible amount in cents (banker's-rounded).
 */
export function calculateAllocation(config: AllocationConfig): number {
  if (config.quantity <= 0 || config.rateOrPercent <= 0) return 0;
  if (config.type === 'mileage') {
    // rate is cents per mile, quantity is miles
    return bankersRound(config.rateOrPercent * config.quantity);
  }
  // home-office: rateOrPercent is business-use percentage, quantity is total expense cents
  return bankersRound((config.quantity * config.rateOrPercent) / 100);
}
