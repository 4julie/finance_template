// SPDX-License-Identifier: BUSL-1.1

/**
 * Debt paydown goal engine.
 *
 * Links a debt balance to a savings-style goal, calculates payoff date
 * at the current payment rate, models extra-payment impact, and reports
 * completion percentage.
 *
 * All monetary values are integer cents.  Interest rates in basis points.
 * Uses banker's rounding.
 *
 * Pure functions — no side effects, fully testable.
 *
 * References: issue #1676
 */

import type { DebtPaydownGoal, DebtPaydownResult, ExtraPaymentImpact } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BPS_PER_PERCENT = 100;
const MONTHS_PER_YEAR = 12;
const MAX_MONTHS = 1200; // 100 years safety cap

// ---------------------------------------------------------------------------
// Banker's rounding
// ---------------------------------------------------------------------------

/**
 * Rounds a number to the nearest integer using banker's rounding
 * (round half to even / IEEE 754 HALF_EVEN).
 */
function bankersRound(value: number): number {
  const rounded = Math.round(value);
  const floor = Math.floor(value);
  const frac = value - floor;
  if (Math.abs(frac - 0.5) < Number.EPSILON) {
    return floor % 2 === 0 ? floor : floor + 1;
  }
  return rounded;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates monthly interest on a balance in cents.
 *
 * @param balanceCents - Outstanding balance in cents.
 * @param annualRateBps - Annual rate in basis points.
 * @returns Monthly interest in cents (banker's rounded).
 */
function monthlyInterest(balanceCents: number, annualRateBps: number): number {
  const monthlyRate = annualRateBps / BPS_PER_PERCENT / 100 / MONTHS_PER_YEAR;
  return bankersRound(balanceCents * monthlyRate);
}

/**
 * Simulates payoff and returns months + total interest.
 *
 * @param balanceCents - Starting balance in cents.
 * @param monthlyPaymentCents - Monthly payment in cents.
 * @param annualRateBps - Annual rate in basis points.
 * @returns Tuple of [months, totalInterestCents].
 */
function simulatePayoff(
  balanceCents: number,
  monthlyPaymentCents: number,
  annualRateBps: number,
): [number, number] {
  if (balanceCents <= 0) return [0, 0];

  let balance = balanceCents;
  let months = 0;
  let totalInterest = 0;

  while (balance > 0 && months < MAX_MONTHS) {
    const interest = monthlyInterest(balance, annualRateBps);
    totalInterest += interest;
    balance += interest;

    const payment = Math.min(monthlyPaymentCents, balance);
    balance -= payment;
    months++;
  }

  return [months, totalInterest];
}

/**
 * Adds a number of months to a Date and returns an ISO date string.
 *
 * @param start - Start date.
 * @param months - Months to add.
 * @returns ISO date string (YYYY-MM-DD).
 */
function addMonths(start: Date, months: number): string {
  const d = new Date(start);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Core calculation
// ---------------------------------------------------------------------------

/**
 * Calculates debt paydown goal progress and payoff projection.
 *
 * @param goal - The debt paydown goal.
 * @param now - Current date (defaults to today).
 * @returns Debt paydown result with completion % and payoff estimate.
 */
export function calculateDebtPaydown(
  goal: DebtPaydownGoal,
  now: Date = new Date(),
): DebtPaydownResult {
  const paidOffCents = Math.max(0, goal.originalBalanceCents - goal.currentBalanceCents);
  const remainingCents = Math.max(0, goal.currentBalanceCents);
  const completionPercent =
    goal.originalBalanceCents > 0
      ? Math.min(100, bankersRound((paidOffCents / goal.originalBalanceCents) * 100))
      : 100;

  const [monthsToPayoff, totalInterestRemainingCents] = simulatePayoff(
    remainingCents,
    goal.monthlyPaymentCents,
    goal.annualRateBps,
  );

  const estimatedPayoffDate = addMonths(now, monthsToPayoff);

  return {
    completionPercent,
    paidOffCents,
    remainingCents,
    monthsToPayoff,
    estimatedPayoffDate,
    totalInterestRemainingCents,
  };
}

/**
 * Calculates the impact of an extra monthly payment on a debt paydown goal.
 *
 * @param goal - The debt paydown goal.
 * @param extraPaymentCents - Additional monthly payment in cents.
 * @param now - Current date (defaults to today).
 * @returns Extra payment impact analysis.
 */
export function calculateExtraPaymentImpact(
  goal: DebtPaydownGoal,
  extraPaymentCents: number,
  now: Date = new Date(),
): ExtraPaymentImpact {
  const [baseMonths, baseInterest] = simulatePayoff(
    goal.currentBalanceCents,
    goal.monthlyPaymentCents,
    goal.annualRateBps,
  );

  const newPayment = goal.monthlyPaymentCents + extraPaymentCents;
  const [newMonths, newInterest] = simulatePayoff(
    goal.currentBalanceCents,
    newPayment,
    goal.annualRateBps,
  );

  return {
    extraPaymentCents,
    newMonthsToPayoff: newMonths,
    monthsSaved: baseMonths - newMonths,
    interestSavedCents: baseInterest - newInterest,
    newPayoffDate: addMonths(now, newMonths),
  };
}
