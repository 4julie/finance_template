// ---------------------------------------------------------------------------
// Debt Interest Tracker & Cost-of-Debt Insights (#1671)
// Pure functions for interest accumulation, cost-of-debt, and portfolio stats.
// All monetary values in integer cents. Banker's rounding for divisions.
// ---------------------------------------------------------------------------

import type {
  CostOfDebtSummary,
  DebtAccount,
  DebtPortfolioSummary,
  InterestBreakdown,
} from './types';
import { bankersRound } from './bulk-operations';
import { buildSchedule } from './extra-payment-sim';

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Compute the daily interest accrual for a debt.
 *
 * @param balanceCents - Current balance in cents.
 * @param annualRateBps - Annual rate in basis points.
 * @returns Daily interest in cents (banker's-rounded).
 */
export function dailyInterest(balanceCents: number, annualRateBps: number): number {
  if (balanceCents <= 0 || annualRateBps <= 0) return 0;
  return bankersRound((balanceCents * annualRateBps) / 10_000 / 365);
}

/**
 * Compute monthly interest breakdown over the life of a debt.
 *
 * @param debt - The debt account.
 * @returns Array of monthly interest breakdowns.
 */
export function monthlyInterestBreakdown(debt: DebtAccount): readonly InterestBreakdown[] {
  const schedule = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);

  return schedule.map((row) => {
    return {
      periodLabel: `Month ${row.month}`,
      interestAccruedCents: row.interestCents,
      principalPaidCents: row.principalCents,
      balanceAfterCents: row.balanceCents,
      interestToPrincipalRatio:
        row.principalCents === 0
          ? Infinity
          : Math.round((row.interestCents / row.principalCents) * 10_000) / 10_000,
    };
  });
}

/**
 * Calculate total interest paid to date, given payments already made.
 *
 * @param debt - The debt account.
 * @param monthsElapsed - Number of months of payments already made.
 * @returns Total interest paid in cents.
 */
export function totalInterestPaidToDate(debt: DebtAccount, monthsElapsed: number): number {
  if (monthsElapsed <= 0) return 0;
  const schedule = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);
  const capped = Math.min(monthsElapsed, schedule.length);
  let total = 0;
  for (let i = 0; i < capped; i++) {
    total += schedule[i].interestCents;
  }
  return total;
}

/**
 * Compute the interest-to-principal ratio over time.
 *
 * @param debt - The debt account.
 * @returns Array of [month, ratio] pairs.
 */
export function interestToPrincipalOverTime(debt: DebtAccount): readonly [number, number][] {
  const schedule = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);

  return schedule.map((row) => [
    row.month,
    row.principalCents === 0
      ? Infinity
      : Math.round((row.interestCents / row.principalCents) * 10_000) / 10_000,
  ]);
}

/**
 * Generate a full cost-of-debt summary for a single debt.
 *
 * @param debt - The debt account.
 * @returns Cost-of-debt summary.
 */
export function costOfDebt(debt: DebtAccount): CostOfDebtSummary {
  const schedule = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);

  const totalInterest = schedule.reduce((sum, r) => sum + r.interestCents, 0);
  const totalPaid = schedule.reduce((sum, r) => sum + r.principalCents + r.interestCents, 0);

  // Effective annual rate = total interest / original balance / years * 10000 bps
  const years = schedule.length / 12;
  const effectiveRate =
    debt.balanceCents === 0 || years === 0
      ? 0
      : bankersRound((totalInterest / debt.balanceCents / years) * 10_000);

  // Approximate payoff date
  const originDate = new Date(debt.originationDate);
  originDate.setMonth(originDate.getMonth() + schedule.length);
  const payoffDate = originDate.toISOString().slice(0, 10);

  return {
    debtId: debt.id,
    totalInterestLifeCents: totalInterest,
    totalPaidCents: totalPaid,
    effectiveAnnualRateBps: effectiveRate,
    remainingInterestCents: totalInterest, // from current balance
    payoffDate,
  };
}

/**
 * Compare interest rates across debts, returning them sorted by rate descending.
 *
 * @param debts - All debt accounts.
 * @returns Debts sorted by annual rate (highest first).
 */
export function interestRateComparison(debts: readonly DebtAccount[]): readonly DebtAccount[] {
  return [...debts].sort((a, b) => b.annualRateBps - a.annualRateBps);
}

/**
 * Compute the weighted average interest rate across a debt portfolio.
 *
 * @param debts - All debt accounts.
 * @returns Weighted average rate in basis points.
 */
export function weightedAverageRate(debts: readonly DebtAccount[]): number {
  const totalBalance = debts.reduce((s, d) => s + d.balanceCents, 0);
  if (totalBalance === 0) return 0;

  const weightedSum = debts.reduce((s, d) => s + d.balanceCents * d.annualRateBps, 0);
  return bankersRound(weightedSum / totalBalance);
}

/**
 * Generate a full debt portfolio summary.
 *
 * @param debts - All debt accounts.
 * @returns Portfolio-level summary with per-debt cost breakdowns.
 */
export function debtPortfolioSummary(debts: readonly DebtAccount[]): DebtPortfolioSummary {
  return {
    weightedAverageRateBps: weightedAverageRate(debts),
    totalBalanceCents: debts.reduce((s, d) => s + d.balanceCents, 0),
    totalMinimumPaymentCents: debts.reduce((s, d) => s + d.minimumPaymentCents, 0),
    debts: debts.map(costOfDebt),
  };
}
