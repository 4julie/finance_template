// ---------------------------------------------------------------------------
// Debt Settlement & Simplification Engine (#1793)
// Consolidation analysis, settlement evaluation, credit impact estimation,
// and payoff strategy comparison (avalanche vs snowball vs settlement).
// All monetary values in integer cents. Banker's rounding for divisions.
// ---------------------------------------------------------------------------

import type {
  ConsolidationAnalysis,
  CreditImpactEstimate,
  CreditImpactLevel,
  DebtAccount,
  NegotiationEntry,
  PayoffStrategy,
  PayoffStrategyComparison,
  SettlementOffer,
} from './types';
import { bankersRound } from './bulk-operations';
import { buildSchedule } from './extra-payment-sim';

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Evaluate a lump-sum settlement offer on a debt.
 *
 * @param debt - The debt account.
 * @param offeredAmountCents - The lump-sum settlement amount in cents.
 * @returns A settlement offer evaluation.
 */
export function evaluateLumpSumOffer(
  debt: DebtAccount,
  offeredAmountCents: number,
): SettlementOffer {
  const savingsCents = debt.balanceCents - offeredAmountCents;
  const savingsPercent =
    debt.balanceCents === 0 ? 0 : Math.round((savingsCents / debt.balanceCents) * 10_000) / 100;

  return {
    debtId: debt.id,
    originalBalanceCents: debt.balanceCents,
    offeredAmountCents,
    savingsCents,
    savingsPercent,
    offerType: 'lump-sum',
  };
}

/**
 * Evaluate a payment-plan settlement offer on a debt.
 *
 * @param debt - The debt account.
 * @param installments - Number of installment payments.
 * @param installmentAmountCents - Amount per installment in cents.
 * @returns A settlement offer evaluation.
 */
export function evaluatePaymentPlanOffer(
  debt: DebtAccount,
  installments: number,
  installmentAmountCents: number,
): SettlementOffer {
  if (installments <= 0) {
    throw new Error('Installments must be > 0');
  }
  const totalOffered = installments * installmentAmountCents;
  const savingsCents = debt.balanceCents - totalOffered;
  const savingsPercent =
    debt.balanceCents === 0 ? 0 : Math.round((savingsCents / debt.balanceCents) * 10_000) / 100;

  return {
    debtId: debt.id,
    originalBalanceCents: debt.balanceCents,
    offeredAmountCents: totalOffered,
    savingsCents,
    savingsPercent,
    offerType: 'payment-plan',
    installments,
    installmentAmountCents,
  };
}

/**
 * Estimate the credit score impact of a debt action.
 *
 * This uses simplified heuristic ranges — not a credit-bureau model.
 *
 * @param action - Description of the action (e.g. "settlement", "paid-in-full").
 * @param balanceCents - The debt balance involved.
 * @param totalCreditCents - Total available credit across all accounts.
 * @returns A credit impact estimate.
 */
export function estimateCreditImpact(
  action: string,
  balanceCents: number,
  totalCreditCents: number,
): CreditImpactEstimate {
  const utilisation = totalCreditCents === 0 ? 1 : balanceCents / totalCreditCents;

  let impactLevel: CreditImpactLevel;
  let estimatedPointsRange: readonly [number, number];
  let recoveryMonths: number;
  let notes: string;

  const normAction = action.toLowerCase();

  if (normAction.includes('paid-in-full') || normAction.includes('payoff')) {
    impactLevel = 'minimal';
    estimatedPointsRange = [0, 10] as const;
    recoveryMonths = 1;
    notes = 'Paying in full has a positive or neutral credit impact.';
  } else if (normAction.includes('settlement')) {
    if (utilisation > 0.5) {
      impactLevel = 'significant';
      estimatedPointsRange = [-100, -45] as const;
      recoveryMonths = 24;
      notes = 'Settlement on high-utilisation debt can significantly impact score.';
    } else {
      impactLevel = 'moderate';
      estimatedPointsRange = [-65, -25] as const;
      recoveryMonths = 12;
      notes = 'Settlement may be reported as "settled for less" and impact score moderately.';
    }
  } else if (normAction.includes('consolidation') || normAction.includes('refinance')) {
    impactLevel = 'moderate';
    estimatedPointsRange = [-30, -5] as const;
    recoveryMonths = 6;
    notes =
      'Hard inquiry and new account may temporarily lower score. Reduced utilisation helps long-term.';
  } else {
    impactLevel = 'minimal';
    estimatedPointsRange = [-10, 0] as const;
    recoveryMonths = 3;
    notes = 'Minor credit impact expected.';
  }

  return {
    action,
    impactLevel,
    estimatedPointsRange,
    recoveryMonths,
    notes,
  };
}

/**
 * Perform a debt consolidation analysis — compare keeping separate debts
 * vs. consolidating them at a new rate.
 *
 * @param debts - Current debt accounts.
 * @param consolidatedRateBps - Proposed consolidated annual rate in basis points.
 * @param consolidatedPaymentCents - Proposed monthly payment on the consolidated loan.
 * @returns A consolidation analysis result.
 */
export function analyzeConsolidation(
  debts: readonly DebtAccount[],
  consolidatedRateBps: number,
  consolidatedPaymentCents: number,
): ConsolidationAnalysis {
  if (debts.length === 0) {
    return {
      currentDebts: [],
      consolidatedRateBps,
      consolidatedBalanceCents: 0,
      currentTotalInterestCents: 0,
      consolidatedTotalInterestCents: 0,
      interestSavingsCents: 0,
      currentPayoffMonths: 0,
      consolidatedPayoffMonths: 0,
      isRecommended: false,
    };
  }

  const consolidatedBalance = debts.reduce((s, d) => s + d.balanceCents, 0);

  // Sum interest from each debt paid separately
  let currentTotalInterest = 0;
  let maxPayoffMonths = 0;
  for (const debt of debts) {
    const schedule = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);
    currentTotalInterest += schedule.reduce((s, r) => s + r.interestCents, 0);
    maxPayoffMonths = Math.max(maxPayoffMonths, schedule.length);
  }

  // Consolidated schedule
  const consolidatedSchedule = buildSchedule(
    consolidatedBalance,
    consolidatedRateBps,
    consolidatedPaymentCents,
  );
  const consolidatedInterest = consolidatedSchedule.reduce((s, r) => s + r.interestCents, 0);

  return {
    currentDebts: debts as DebtAccount[],
    consolidatedRateBps,
    consolidatedBalanceCents: consolidatedBalance,
    currentTotalInterestCents: currentTotalInterest,
    consolidatedTotalInterestCents: consolidatedInterest,
    interestSavingsCents: currentTotalInterest - consolidatedInterest,
    currentPayoffMonths: maxPayoffMonths,
    consolidatedPayoffMonths: consolidatedSchedule.length,
    isRecommended: consolidatedInterest < currentTotalInterest,
  };
}

/**
 * Compare payoff strategies: avalanche, snowball, and settlement.
 *
 * @param debts - All debt accounts.
 * @param monthlyBudgetCents - Total monthly budget for debt repayment.
 * @param settlementPercent - Settlement offer as a percentage of balance (0-100).
 * @returns Comparison of the three strategies.
 */
export function comparePayoffStrategies(
  debts: readonly DebtAccount[],
  monthlyBudgetCents: number,
  settlementPercent: number = 50,
): readonly PayoffStrategyComparison[] {
  if (debts.length === 0) return [];

  const totalMinPayment = debts.reduce((s, d) => s + d.minimumPaymentCents, 0);
  const extraBudget = Math.max(0, monthlyBudgetCents - totalMinPayment);

  // --- Avalanche (highest rate first) ---
  const avalanche = simulateStrategy(
    [...debts].sort((a, b) => b.annualRateBps - a.annualRateBps),
    extraBudget,
  );

  // --- Snowball (lowest balance first) ---
  const snowball = simulateStrategy(
    [...debts].sort((a, b) => a.balanceCents - b.balanceCents),
    extraBudget,
  );

  // --- Settlement ---
  const settlementTotal = debts.reduce(
    (s, d) => s + bankersRound((d.balanceCents * settlementPercent) / 100),
    0,
  );
  const settlementMonths =
    monthlyBudgetCents === 0 ? Infinity : Math.ceil(settlementTotal / monthlyBudgetCents);

  return [
    {
      strategy: 'avalanche' as PayoffStrategy,
      totalPaidCents: avalanche.totalPaid,
      totalInterestCents: avalanche.totalInterest,
      payoffMonths: avalanche.months,
      monthlyPaymentCents: monthlyBudgetCents,
    },
    {
      strategy: 'snowball' as PayoffStrategy,
      totalPaidCents: snowball.totalPaid,
      totalInterestCents: snowball.totalInterest,
      payoffMonths: snowball.months,
      monthlyPaymentCents: monthlyBudgetCents,
    },
    {
      strategy: 'settlement' as PayoffStrategy,
      totalPaidCents: settlementTotal,
      totalInterestCents: 0,
      payoffMonths: settlementMonths === Infinity ? 0 : settlementMonths,
      monthlyPaymentCents: monthlyBudgetCents,
    },
  ];
}

// ── Internal helpers ───────────────────────────────────────────────────────

interface StrategyResult {
  totalPaid: number;
  totalInterest: number;
  months: number;
}

/**
 * Simulate paying debts in the given order, directing extra budget to the
 * first debt in the list until it's paid off, then rolling over to the next.
 */
function simulateStrategy(
  orderedDebts: readonly DebtAccount[],
  extraBudgetCents: number,
): StrategyResult {
  // Deep-copy balances
  const balances = orderedDebts.map((d) => d.balanceCents);
  let totalPaid = 0;
  let totalInterest = 0;
  let month = 0;
  const maxMonths = 600;

  while (balances.some((b) => b > 0) && month < maxMonths) {
    month++;
    let extraRemaining = extraBudgetCents;

    for (let i = 0; i < orderedDebts.length; i++) {
      if (balances[i] <= 0) continue;

      const debt = orderedDebts[i];
      const interest = bankersRound((balances[i] * debt.annualRateBps) / 10_000 / 12);
      totalInterest += interest;

      // Extra goes to the first unpaid debt in order
      const isTarget = balances.findIndex((b) => b > 0) === i;
      const extra = isTarget ? extraRemaining : 0;
      if (isTarget) extraRemaining = 0;

      const payment = Math.min(balances[i] + interest, debt.minimumPaymentCents + extra);
      const principal = Math.max(0, payment - interest);
      balances[i] = Math.max(0, balances[i] - principal);
      totalPaid += payment;
    }
  }

  return { totalPaid, totalInterest, months: month };
}

/**
 * Create a negotiation tracking entry.
 *
 * @param debtId - The debt this negotiation is for.
 * @param date - ISO-8601 date of the negotiation event.
 * @param offeredAmountCents - Amount offered in cents.
 * @param status - Current status of the negotiation.
 * @param notes - Free-text notes.
 * @param counterOfferCents - Optional counter-offer from creditor.
 * @returns A negotiation entry record.
 */
export function createNegotiationEntry(
  debtId: string,
  date: string,
  offeredAmountCents: number,
  status: NegotiationEntry['status'],
  notes: string,
  counterOfferCents?: number,
): NegotiationEntry {
  return {
    debtId,
    date,
    offeredAmountCents,
    counterOfferCents,
    status,
    notes,
  };
}
