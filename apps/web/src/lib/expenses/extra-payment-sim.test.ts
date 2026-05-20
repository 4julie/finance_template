// ---------------------------------------------------------------------------
// Tests — Extra-Payment Simulator (#1666)
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';
import type { DebtAccount, ExtraPaymentScenario } from './types';
import {
  buildSchedule,
  monthlyInterest,
  monthlyRate,
  optimalExtraPaymentAllocation,
  simulateExtraPayment,
} from './extra-payment-sim';

// ── Fixtures ───────────────────────────────────────────────────────────────

const debt: DebtAccount = {
  id: 'cc-1',
  name: 'Credit Card',
  balanceCents: 500_000, // $5,000
  annualRateBps: 2000, // 20%
  minimumPaymentCents: 15_000, // $150
  originationDate: '2023-01-01',
};

const lowRateDebt: DebtAccount = {
  id: 'auto-1',
  name: 'Auto Loan',
  balanceCents: 1_000_000, // $10,000
  annualRateBps: 500, // 5%
  minimumPaymentCents: 20_000, // $200
  originationDate: '2023-06-01',
};

// ── monthlyRate ────────────────────────────────────────────────────────────

describe('monthlyRate', () => {
  it('converts basis points to monthly decimal', () => {
    expect(monthlyRate(1200)).toBeCloseTo(0.01, 6); // 12% / 12 = 1%
  });

  it('returns 0 for zero or negative rate', () => {
    expect(monthlyRate(0)).toBe(0);
    expect(monthlyRate(-100)).toBe(0);
  });
});

// ── monthlyInterest ────────────────────────────────────────────────────────

describe('monthlyInterest', () => {
  it('computes monthly interest in cents', () => {
    // $5,000 at 20% → monthly rate 1.6667% → $83.33 → 8333 cents
    const interest = monthlyInterest(500_000, 2000);
    expect(interest).toBe(8333);
  });

  it('returns 0 for zero balance', () => {
    expect(monthlyInterest(0, 2000)).toBe(0);
  });

  it('returns 0 for zero rate', () => {
    expect(monthlyInterest(500_000, 0)).toBe(0);
  });
});

// ── buildSchedule ──────────────────────────────────────────────────────────

describe('buildSchedule', () => {
  it('builds a complete amortisation schedule', () => {
    const schedule = buildSchedule(500_000, 2000, 15_000);
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[schedule.length - 1].balanceCents).toBe(0);
  });

  it('returns empty for zero balance', () => {
    expect(buildSchedule(0, 2000, 15_000)).toEqual([]);
  });

  it('returns empty for zero payment', () => {
    expect(buildSchedule(500_000, 2000, 0)).toEqual([]);
  });

  it('schedule with extra payments is shorter', () => {
    const original = buildSchedule(500_000, 2000, 15_000);
    const withExtra = buildSchedule(500_000, 2000, 15_000, 5_000);
    expect(withExtra.length).toBeLessThan(original.length);
  });

  it('handles one-time extra payment', () => {
    const original = buildSchedule(500_000, 2000, 15_000);
    const withOneTime = buildSchedule(500_000, 2000, 15_000, 0, 100_000);
    expect(withOneTime.length).toBeLessThan(original.length);
  });

  it('respects maxMonths safety cap', () => {
    // Very low payment on high balance — would take forever
    const schedule = buildSchedule(10_000_000, 100, 1, 0, 0, 10);
    expect(schedule.length).toBeLessThanOrEqual(10);
  });
});

// ── simulateExtraPayment ───────────────────────────────────────────────────

describe('simulateExtraPayment', () => {
  it('shows months saved with recurring extra payment', () => {
    const scenario: ExtraPaymentScenario = {
      debtId: 'cc-1',
      extraAmountCents: 5_000,
      kind: 'recurring',
    };
    const result = simulateExtraPayment(debt, scenario);
    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.interestSavingsCents).toBeGreaterThan(0);
    expect(result.newPayoffMonths).toBeLessThan(result.originalPayoffMonths);
    expect(result.schedule.length).toBe(result.newPayoffMonths);
  });

  it('shows months saved with one-time extra payment', () => {
    const scenario: ExtraPaymentScenario = {
      debtId: 'cc-1',
      extraAmountCents: 100_000,
      kind: 'one-time',
    };
    const result = simulateExtraPayment(debt, scenario);
    expect(result.monthsSaved).toBeGreaterThan(0);
    expect(result.interestSavingsCents).toBeGreaterThan(0);
  });

  it('returns zero savings when extra amount is 0', () => {
    const scenario: ExtraPaymentScenario = {
      debtId: 'cc-1',
      extraAmountCents: 0,
      kind: 'recurring',
    };
    const result = simulateExtraPayment(debt, scenario);
    expect(result.monthsSaved).toBe(0);
    expect(result.interestSavingsCents).toBe(0);
  });
});

// ── optimalExtraPaymentAllocation ──────────────────────────────────────────

describe('optimalExtraPaymentAllocation', () => {
  it('allocates to highest-rate debt first (avalanche)', () => {
    const allocations = optimalExtraPaymentAllocation([debt, lowRateDebt], 10_000);
    // debt (20%) should get allocation before lowRateDebt (5%)
    const ccAllocation = allocations.find((a) => a.debtId === 'cc-1');
    expect(ccAllocation).toBeDefined();
    expect(ccAllocation!.allocationCents).toBe(10_000);
  });

  it('returns empty for no debts', () => {
    expect(optimalExtraPaymentAllocation([], 10_000)).toEqual([]);
  });

  it('returns empty for zero extra amount', () => {
    expect(optimalExtraPaymentAllocation([debt], 0)).toEqual([]);
  });

  it('spreads allocation when extra exceeds first debt balance', () => {
    const smallDebt: DebtAccount = {
      ...debt,
      balanceCents: 5_000, // $50
    };
    const allocations = optimalExtraPaymentAllocation([smallDebt, lowRateDebt], 10_000);
    const small = allocations.find((a) => a.debtId === 'cc-1');
    const auto = allocations.find((a) => a.debtId === 'auto-1');
    expect(small!.allocationCents).toBe(5_000);
    expect(auto!.allocationCents).toBe(5_000);
  });
});
