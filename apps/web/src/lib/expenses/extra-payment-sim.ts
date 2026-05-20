// ---------------------------------------------------------------------------
// Extra-Payment Simulator (#1666)
// Pure functions to simulate the impact of extra payments on debt payoff.
// All monetary values in integer cents. Banker's rounding for divisions.
// ---------------------------------------------------------------------------

import type {
  AmortisationRow,
  DebtAccount,
  ExtraPaymentScenario,
  OptimalAllocation,
  PayoffSimulationResult,
} from './types';
import { bankersRound } from './bulk-operations';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert annual rate in basis points to a monthly decimal rate.
 * @param annualRateBps - Annual rate in basis points (e.g. 525 = 5.25 %).
 * @returns Monthly decimal rate (e.g. 0.004375).
 */
export function monthlyRate(annualRateBps: number): number {
  if (annualRateBps <= 0) return 0;
  return annualRateBps / 10_000 / 12;
}

/**
 * Compute the monthly interest charge on a balance.
 * @param balanceCents - Outstanding balance in cents.
 * @param annualRateBps - Annual rate in basis points.
 * @returns Interest for the month in cents (banker's-rounded).
 */
export function monthlyInterest(balanceCents: number, annualRateBps: number): number {
  if (balanceCents <= 0 || annualRateBps <= 0) return 0;
  return bankersRound(balanceCents * monthlyRate(annualRateBps));
}

// ── Core: amortisation schedule builder ────────────────────────────────────

/**
 * Build an amortisation schedule for a debt with optional extra payments.
 *
 * @param balance - Starting balance in cents.
 * @param annualRateBps - Annual rate in basis points.
 * @param minimumPaymentCents - Minimum monthly payment in cents.
 * @param extraPerMonthCents - Extra payment applied each month in cents.
 * @param oneTimeExtraCents - One-time extra payment applied in month 1 in cents.
 * @param maxMonths - Safety cap to avoid infinite loops (default 600 = 50 years).
 * @returns The amortisation schedule.
 */
export function buildSchedule(
  balance: number,
  annualRateBps: number,
  minimumPaymentCents: number,
  extraPerMonthCents: number = 0,
  oneTimeExtraCents: number = 0,
  maxMonths: number = 600,
): readonly AmortisationRow[] {
  if (balance <= 0 || minimumPaymentCents <= 0) return [];

  const rows: AmortisationRow[] = [];
  let remaining = balance;
  let month = 0;

  while (remaining > 0 && month < maxMonths) {
    month++;
    const interest = monthlyInterest(remaining, annualRateBps);
    const extra = (month === 1 ? oneTimeExtraCents : 0) + extraPerMonthCents;
    const totalPayment = Math.min(remaining + interest, minimumPaymentCents + extra);
    const principal = Math.max(0, totalPayment - interest);
    remaining = Math.max(0, remaining - principal);

    rows.push({
      month,
      principalCents: principal,
      interestCents: interest,
      balanceCents: remaining,
      extraPaymentCents: Math.min(
        extra,
        totalPayment - minimumPaymentCents > 0 ? totalPayment - minimumPaymentCents : 0,
      ),
    });
  }

  return rows;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Simulate the impact of an extra payment scenario on a single debt.
 *
 * Returns a comparison of the original payoff timeline versus the
 * accelerated one, including total interest savings.
 *
 * @param debt - The debt account details.
 * @param scenario - The extra payment scenario.
 * @returns Full simulation result with both schedules compared.
 */
export function simulateExtraPayment(
  debt: DebtAccount,
  scenario: ExtraPaymentScenario,
): PayoffSimulationResult {
  const original = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);

  const extraRecurring = scenario.kind === 'recurring' ? scenario.extraAmountCents : 0;
  const extraOneTime = scenario.kind === 'one-time' ? scenario.extraAmountCents : 0;

  const withExtra = buildSchedule(
    debt.balanceCents,
    debt.annualRateBps,
    debt.minimumPaymentCents,
    extraRecurring,
    extraOneTime,
  );

  const totalInterestOriginal = original.reduce((sum, r) => sum + r.interestCents, 0);
  const totalInterestNew = withExtra.reduce((sum, r) => sum + r.interestCents, 0);

  return {
    originalPayoffMonths: original.length,
    newPayoffMonths: withExtra.length,
    monthsSaved: original.length - withExtra.length,
    totalInterestOriginalCents: totalInterestOriginal,
    totalInterestNewCents: totalInterestNew,
    interestSavingsCents: totalInterestOriginal - totalInterestNew,
    schedule: withExtra,
  };
}

/**
 * Determine the optimal allocation of extra cash across multiple debts
 * using the avalanche strategy (highest rate first).
 *
 * @param debts - All debt accounts.
 * @param totalExtraCents - Total extra cash available per month in cents.
 * @returns Allocation per debt sorted by interest savings (descending).
 */
export function optimalExtraPaymentAllocation(
  debts: readonly DebtAccount[],
  totalExtraCents: number,
): readonly OptimalAllocation[] {
  if (debts.length === 0 || totalExtraCents <= 0) return [];

  // Sort by annual rate descending (avalanche)
  const sorted = [...debts].sort((a, b) => b.annualRateBps - a.annualRateBps);

  let remaining = totalExtraCents;
  const allocations: OptimalAllocation[] = [];

  for (const debt of sorted) {
    if (remaining <= 0) {
      allocations.push({
        debtId: debt.id,
        allocationCents: 0,
        interestSavingsCents: 0,
      });
      continue;
    }

    // Allocate as much as possible to this debt (up to its balance)
    const allocation = Math.min(remaining, debt.balanceCents);
    remaining -= allocation;

    // Simulate savings
    const baseline = buildSchedule(debt.balanceCents, debt.annualRateBps, debt.minimumPaymentCents);
    const withExtra = buildSchedule(
      debt.balanceCents,
      debt.annualRateBps,
      debt.minimumPaymentCents,
      allocation,
    );
    const baseInterest = baseline.reduce((s, r) => s + r.interestCents, 0);
    const newInterest = withExtra.reduce((s, r) => s + r.interestCents, 0);

    allocations.push({
      debtId: debt.id,
      allocationCents: allocation,
      interestSavingsCents: baseInterest - newInterest,
    });
  }

  return allocations.sort((a, b) => b.interestSavingsCents - a.interestSavingsCents);
}
