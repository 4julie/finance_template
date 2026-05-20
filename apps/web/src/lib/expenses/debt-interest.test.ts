// ---------------------------------------------------------------------------
// Tests — Debt Interest Tracker (#1671)
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';
import type { DebtAccount } from './types';
import {
  costOfDebt,
  dailyInterest,
  debtPortfolioSummary,
  interestRateComparison,
  interestToPrincipalOverTime,
  monthlyInterestBreakdown,
  totalInterestPaidToDate,
  weightedAverageRate,
} from './debt-interest';

// ── Fixtures ───────────────────────────────────────────────────────────────

const cc: DebtAccount = {
  id: 'cc-1',
  name: 'Credit Card',
  balanceCents: 500_000,
  annualRateBps: 2000,
  minimumPaymentCents: 15_000,
  originationDate: '2023-01-01',
};

const auto: DebtAccount = {
  id: 'auto-1',
  name: 'Auto Loan',
  balanceCents: 1_000_000,
  annualRateBps: 500,
  minimumPaymentCents: 20_000,
  originationDate: '2023-06-01',
};

const mortgage: DebtAccount = {
  id: 'mort-1',
  name: 'Mortgage',
  balanceCents: 25_000_000,
  annualRateBps: 650,
  minimumPaymentCents: 150_000,
  originationDate: '2020-01-01',
};

// ── dailyInterest ──────────────────────────────────────────────────────────

describe('dailyInterest', () => {
  it('computes daily interest', () => {
    // $5,000 at 20% → 5000*0.20/365 ≈ $2.74 → 274 cents
    const daily = dailyInterest(500_000, 2000);
    expect(daily).toBe(274);
  });

  it('returns 0 for zero balance', () => {
    expect(dailyInterest(0, 2000)).toBe(0);
  });

  it('returns 0 for zero rate', () => {
    expect(dailyInterest(500_000, 0)).toBe(0);
  });
});

// ── monthlyInterestBreakdown ───────────────────────────────────────────────

describe('monthlyInterestBreakdown', () => {
  it('returns non-empty breakdown for a valid debt', () => {
    const breakdown = monthlyInterestBreakdown(cc);
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0].periodLabel).toBe('Month 1');
    expect(breakdown[0].interestAccruedCents).toBeGreaterThan(0);
  });

  it('has decreasing interest over time', () => {
    const breakdown = monthlyInterestBreakdown(cc);
    const first = breakdown[0].interestAccruedCents;
    const last = breakdown[breakdown.length - 1].interestAccruedCents;
    expect(last).toBeLessThan(first);
  });

  it('interest-to-principal ratio decreases over time', () => {
    const breakdown = monthlyInterestBreakdown(cc);
    const firstRatio = breakdown[0].interestToPrincipalRatio;
    const midRatio = breakdown[Math.floor(breakdown.length / 2)].interestToPrincipalRatio;
    expect(midRatio).toBeLessThan(firstRatio);
  });
});

// ── totalInterestPaidToDate ────────────────────────────────────────────────

describe('totalInterestPaidToDate', () => {
  it('returns 0 for 0 months elapsed', () => {
    expect(totalInterestPaidToDate(cc, 0)).toBe(0);
  });

  it('returns interest for first month', () => {
    const interest = totalInterestPaidToDate(cc, 1);
    expect(interest).toBe(8333); // ~$83.33
  });

  it('accumulates over multiple months', () => {
    const m1 = totalInterestPaidToDate(cc, 1);
    const m6 = totalInterestPaidToDate(cc, 6);
    expect(m6).toBeGreaterThan(m1);
  });

  it('caps at schedule length for excessive months', () => {
    const full = totalInterestPaidToDate(cc, 9999);
    const correct = totalInterestPaidToDate(cc, 600);
    // Both should equal total lifetime interest
    expect(full).toBe(correct);
  });
});

// ── interestToPrincipalOverTime ────────────────────────────────────────────

describe('interestToPrincipalOverTime', () => {
  it('returns ratios that generally decrease', () => {
    const ratios = interestToPrincipalOverTime(cc);
    expect(ratios.length).toBeGreaterThan(0);
    const [, firstRatio] = ratios[0];
    const [, lastRatio] = ratios[ratios.length - 1];
    expect(lastRatio).toBeLessThan(firstRatio);
  });
});

// ── costOfDebt ─────────────────────────────────────────────────────────────

describe('costOfDebt', () => {
  it('computes total interest and payoff date', () => {
    const summary = costOfDebt(cc);
    expect(summary.debtId).toBe('cc-1');
    expect(summary.totalInterestLifeCents).toBeGreaterThan(0);
    expect(summary.totalPaidCents).toBeGreaterThan(summary.totalInterestLifeCents);
    expect(summary.payoffDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('total paid = balance + total interest', () => {
    const summary = costOfDebt(cc);
    expect(summary.totalPaidCents).toBe(cc.balanceCents + summary.totalInterestLifeCents);
  });
});

// ── interestRateComparison ─────────────────────────────────────────────────

describe('interestRateComparison', () => {
  it('sorts by rate descending', () => {
    const sorted = interestRateComparison([auto, cc, mortgage]);
    expect(sorted[0].id).toBe('cc-1');
    expect(sorted[1].id).toBe('mort-1');
    expect(sorted[2].id).toBe('auto-1');
  });
});

// ── weightedAverageRate ────────────────────────────────────────────────────

describe('weightedAverageRate', () => {
  it('computes weighted average across portfolio', () => {
    const rate = weightedAverageRate([cc, auto]);
    // cc: 500k @ 2000, auto: 1M @ 500
    // weighted = (500000*2000 + 1000000*500) / 1500000 = 1500000000/1500000 = 1000
    expect(rate).toBe(1000);
  });

  it('returns 0 for empty portfolio', () => {
    expect(weightedAverageRate([])).toBe(0);
  });

  it('returns the rate for single debt', () => {
    expect(weightedAverageRate([cc])).toBe(2000);
  });
});

// ── debtPortfolioSummary ───────────────────────────────────────────────────

describe('debtPortfolioSummary', () => {
  it('aggregates portfolio stats', () => {
    const summary = debtPortfolioSummary([cc, auto]);
    expect(summary.totalBalanceCents).toBe(1_500_000);
    expect(summary.totalMinimumPaymentCents).toBe(35_000);
    expect(summary.weightedAverageRateBps).toBe(1000);
    expect(summary.debts).toHaveLength(2);
  });
});
