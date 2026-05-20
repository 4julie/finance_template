// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  accumulateDailySpending,
  daysInMonth,
  dayOfMonth,
  determinePace,
  rollingAverageDailySpend,
  projectMonthEndSpending,
} from './daily-spending';
import type { DailyTransaction, DailySpend } from './daily-spending';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(date: string, amountCents: number): DailyTransaction {
  return { date, amountCents };
}

// ---------------------------------------------------------------------------
// daysInMonth
// ---------------------------------------------------------------------------

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    expect(daysInMonth(2024, 1)).toBe(31);
  });

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
  });

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(2023, 2)).toBe(28);
  });

  it('returns 30 for April', () => {
    expect(daysInMonth(2024, 4)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// dayOfMonth
// ---------------------------------------------------------------------------

describe('dayOfMonth', () => {
  it('extracts day number from ISO date', () => {
    expect(dayOfMonth('2024-06-15')).toBe(15);
    expect(dayOfMonth('2024-01-01')).toBe(1);
    expect(dayOfMonth('2024-12-31')).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// accumulateDailySpending
// ---------------------------------------------------------------------------

describe('accumulateDailySpending', () => {
  it('accumulates spending by day with cumulative sum', () => {
    const txs: DailyTransaction[] = [
      makeTx('2024-06-01', 1000),
      makeTx('2024-06-01', 500),
      makeTx('2024-06-03', 2000),
    ];
    const result = accumulateDailySpending(txs);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2024-06-01', totalCents: 1500, cumulativeCents: 1500 });
    expect(result[1]).toEqual({ date: '2024-06-03', totalCents: 2000, cumulativeCents: 3500 });
  });

  it('returns empty for empty input', () => {
    expect(accumulateDailySpending([])).toEqual([]);
  });

  it('handles single transaction', () => {
    const result = accumulateDailySpending([makeTx('2024-06-15', 500)]);
    expect(result).toHaveLength(1);
    expect(result[0].cumulativeCents).toBe(500);
  });

  it('handles zero-amount transactions', () => {
    const txs = [makeTx('2024-06-01', 0), makeTx('2024-06-01', 0)];
    const result = accumulateDailySpending(txs);
    expect(result[0].totalCents).toBe(0);
    expect(result[0].cumulativeCents).toBe(0);
  });

  it('handles same-day duplicates', () => {
    const txs = [makeTx('2024-06-01', 100), makeTx('2024-06-01', 200), makeTx('2024-06-01', 300)];
    const result = accumulateDailySpending(txs);
    expect(result).toHaveLength(1);
    expect(result[0].totalCents).toBe(600);
  });

  it('sorts results chronologically', () => {
    const txs = [makeTx('2024-06-15', 100), makeTx('2024-06-01', 200)];
    const result = accumulateDailySpending(txs);
    expect(result[0].date).toBe('2024-06-01');
    expect(result[1].date).toBe('2024-06-15');
  });
});

// ---------------------------------------------------------------------------
// determinePace
// ---------------------------------------------------------------------------

describe('determinePace', () => {
  it('returns on-track when within tolerance', () => {
    expect(determinePace(10000, 10000)).toBe('on-track');
    expect(determinePace(10200, 10000)).toBe('on-track');
  });

  it('returns over-budget when exceeding tolerance', () => {
    expect(determinePace(11000, 10000)).toBe('over-budget');
  });

  it('returns under-budget when well below', () => {
    expect(determinePace(9000, 10000)).toBe('under-budget');
  });

  it('returns on-track when budget is 0', () => {
    expect(determinePace(5000, 0)).toBe('on-track');
  });

  it('respects custom tolerance', () => {
    // 10% tolerance: 10000 ± 1000
    expect(determinePace(10800, 10000, 10)).toBe('on-track');
    expect(determinePace(11100, 10000, 10)).toBe('over-budget');
  });
});

// ---------------------------------------------------------------------------
// rollingAverageDailySpend
// ---------------------------------------------------------------------------

describe('rollingAverageDailySpend', () => {
  const dailySpends: DailySpend[] = [
    { date: '2024-06-01', totalCents: 1000, cumulativeCents: 1000 },
    { date: '2024-06-02', totalCents: 2000, cumulativeCents: 3000 },
    { date: '2024-06-03', totalCents: 3000, cumulativeCents: 6000 },
    { date: '2024-06-04', totalCents: 4000, cumulativeCents: 10000 },
  ];

  it('calculates rolling average for last N days', () => {
    // Last 2: (3000 + 4000) / 2 = 3500
    expect(rollingAverageDailySpend(dailySpends, 2)).toBe(3500);
  });

  it('uses all data when window exceeds length', () => {
    // All 4: (1000 + 2000 + 3000 + 4000) / 4 = 2500
    expect(rollingAverageDailySpend(dailySpends, 10)).toBe(2500);
  });

  it('returns 0 for empty input', () => {
    expect(rollingAverageDailySpend([], 7)).toBe(0);
  });

  it('returns 0 for window of 0', () => {
    expect(rollingAverageDailySpend(dailySpends, 0)).toBe(0);
  });

  it('handles single day', () => {
    expect(rollingAverageDailySpend([dailySpends[0]], 7)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// projectMonthEndSpending
// ---------------------------------------------------------------------------

describe('projectMonthEndSpending', () => {
  it('projects month-end spending from daily transactions', () => {
    const txs: DailyTransaction[] = [
      makeTx('2024-06-01', 1000),
      makeTx('2024-06-02', 2000),
      makeTx('2024-06-03', 3000),
    ];
    const result = projectMonthEndSpending(txs, 2024, 6, 3, 100000);
    expect(result.spentSoFarCents).toBe(6000);
    expect(result.daysElapsed).toBe(3);
    expect(result.totalDays).toBe(30);
    // 6000 / 3 * 30 = 60000
    expect(result.projectedTotalCents).toBe(60000);
    expect(result.avgDailySpendCents).toBe(2000);
    expect(result.budgetCents).toBe(100000);
    expect(result.pace).toBe('under-budget');
  });

  it('returns spent so far when daysElapsed is 0', () => {
    const txs: DailyTransaction[] = [makeTx('2024-06-01', 1000)];
    const result = projectMonthEndSpending(txs, 2024, 6, 0);
    expect(result.projectedTotalCents).toBe(1000);
    expect(result.avgDailySpendCents).toBe(0);
  });

  it('handles empty transactions', () => {
    const result = projectMonthEndSpending([], 2024, 6, 15);
    expect(result.spentSoFarCents).toBe(0);
    expect(result.projectedTotalCents).toBe(0);
    expect(result.avgDailySpendCents).toBe(0);
    expect(result.pace).toBe('on-track');
  });

  it('caps daysElapsed at totalDays', () => {
    const txs = [makeTx('2024-06-01', 3000)];
    const result = projectMonthEndSpending(txs, 2024, 6, 35);
    expect(result.daysElapsed).toBe(30);
  });

  it('handles over-budget pace', () => {
    const txs = [makeTx('2024-06-01', 5000), makeTx('2024-06-02', 5000)];
    // Spent 10000 in 2 days, projected = 10000/2*30 = 150000
    const result = projectMonthEndSpending(txs, 2024, 6, 2, 50000);
    expect(result.pace).toBe('over-budget');
  });

  it('calculates rolling average', () => {
    const txs = [
      makeTx('2024-06-01', 1000),
      makeTx('2024-06-02', 2000),
      makeTx('2024-06-03', 3000),
    ];
    const result = projectMonthEndSpending(txs, 2024, 6, 3, 0, 2);
    // Last 2 days: (2000 + 3000) / 2 = 2500
    expect(result.rollingAvgDailySpendCents).toBe(2500);
  });
});
