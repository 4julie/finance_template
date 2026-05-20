// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  aggregateByMerchant,
  topMerchantsBySpend,
  topMerchantsByFrequency,
  merchantTrend,
  averageTransactionByMerchant,
  extractPeriod,
} from './merchant-insights';
import type { MerchantTransaction } from './merchant-insights';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<MerchantTransaction> = {}): MerchantTransaction {
  return {
    id: 'tx-1',
    merchant: 'Coffee Shop',
    amountCents: 450,
    date: '2024-06-15',
    categoryId: 'cat-food',
    ...overrides,
  };
}

const sampleTransactions: MerchantTransaction[] = [
  makeTx({ id: 'tx-1', merchant: 'Coffee Shop', amountCents: 450, date: '2024-06-01' }),
  makeTx({ id: 'tx-2', merchant: 'Coffee Shop', amountCents: 500, date: '2024-06-15' }),
  makeTx({ id: 'tx-3', merchant: 'Grocery Store', amountCents: 8000, date: '2024-06-05' }),
  makeTx({ id: 'tx-4', merchant: 'Grocery Store', amountCents: 7500, date: '2024-06-20' }),
  makeTx({ id: 'tx-5', merchant: 'Grocery Store', amountCents: 6000, date: '2024-07-01' }),
  makeTx({ id: 'tx-6', merchant: 'Gas Station', amountCents: 5500, date: '2024-06-10' }),
];

// ---------------------------------------------------------------------------
// extractPeriod
// ---------------------------------------------------------------------------

describe('extractPeriod', () => {
  it('extracts year-month from ISO date', () => {
    expect(extractPeriod('2024-06-15')).toBe('2024-06');
    expect(extractPeriod('2023-12-31')).toBe('2023-12');
  });
});

// ---------------------------------------------------------------------------
// aggregateByMerchant
// ---------------------------------------------------------------------------

describe('aggregateByMerchant', () => {
  it('aggregates spending by merchant', () => {
    const result = aggregateByMerchant(sampleTransactions);
    expect(result).toHaveLength(3);
    // Sorted by total descending: Grocery (21500), Gas (5500), Coffee (950)
    expect(result[0].merchant).toBe('Grocery Store');
    expect(result[0].totalCents).toBe(21500);
    expect(result[0].transactionCount).toBe(3);
  });

  it('calculates average transaction size with bankers rounding', () => {
    const result = aggregateByMerchant(sampleTransactions);
    const coffee = result.find((s) => s.merchant === 'Coffee Shop')!;
    // 950 / 2 = 475 exactly
    expect(coffee.averageCents).toBe(475);
  });

  it('tracks first and last transaction dates', () => {
    const result = aggregateByMerchant(sampleTransactions);
    const grocery = result.find((s) => s.merchant === 'Grocery Store')!;
    expect(grocery.firstTransactionDate).toBe('2024-06-05');
    expect(grocery.lastTransactionDate).toBe('2024-07-01');
  });

  it('returns empty for empty input', () => {
    expect(aggregateByMerchant([])).toEqual([]);
  });

  it('handles single transaction', () => {
    const result = aggregateByMerchant([makeTx()]);
    expect(result).toHaveLength(1);
    expect(result[0].transactionCount).toBe(1);
    expect(result[0].averageCents).toBe(450);
  });

  it('handles zero-amount transactions', () => {
    const txs = [makeTx({ amountCents: 0 }), makeTx({ id: 'tx-2', amountCents: 0 })];
    const result = aggregateByMerchant(txs);
    expect(result[0].totalCents).toBe(0);
    expect(result[0].averageCents).toBe(0);
  });

  it('handles same-day duplicate transactions', () => {
    const txs = [
      makeTx({ id: 'tx-a', date: '2024-06-15', amountCents: 100 }),
      makeTx({ id: 'tx-b', date: '2024-06-15', amountCents: 200 }),
    ];
    const result = aggregateByMerchant(txs);
    expect(result[0].totalCents).toBe(300);
    expect(result[0].transactionCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// topMerchantsBySpend
// ---------------------------------------------------------------------------

describe('topMerchantsBySpend', () => {
  it('returns top N merchants by spend', () => {
    const result = topMerchantsBySpend(sampleTransactions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].merchant).toBe('Grocery Store');
    expect(result[0].rank).toBe(1);
    expect(result[1].merchant).toBe('Gas Station');
    expect(result[1].rank).toBe(2);
  });

  it('returns all when limit exceeds count', () => {
    expect(topMerchantsBySpend(sampleTransactions, 100)).toHaveLength(3);
  });

  it('returns empty for empty input', () => {
    expect(topMerchantsBySpend([], 5)).toEqual([]);
  });

  it('handles limit of 0', () => {
    expect(topMerchantsBySpend(sampleTransactions, 0)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// topMerchantsByFrequency
// ---------------------------------------------------------------------------

describe('topMerchantsByFrequency', () => {
  it('returns top N merchants by transaction count', () => {
    const result = topMerchantsByFrequency(sampleTransactions, 2);
    expect(result).toHaveLength(2);
    expect(result[0].merchant).toBe('Grocery Store');
    expect(result[0].value).toBe(3);
    expect(result[0].rank).toBe(1);
  });

  it('returns empty for empty input', () => {
    expect(topMerchantsByFrequency([], 5)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// merchantTrend
// ---------------------------------------------------------------------------

describe('merchantTrend', () => {
  it('calculates trend for a merchant across periods', () => {
    const result = merchantTrend(sampleTransactions, 'Grocery Store');
    expect(result.merchant).toBe('Grocery Store');
    expect(result.periods).toHaveLength(2);
    expect(result.periods[0].period).toBe('2024-06');
    expect(result.periods[0].totalCents).toBe(15500);
    expect(result.periods[1].period).toBe('2024-07');
    expect(result.periods[1].totalCents).toBe(6000);
  });

  it('calculates change percentage', () => {
    const result = merchantTrend(sampleTransactions, 'Grocery Store');
    expect(result.changeCents).toBe(6000 - 15500);
    // (6000 - 15500) / 15500 * 100 = -61.29... => banker's round = -61
    expect(result.changePercent).toBe(-61);
  });

  it('returns empty periods for unknown merchant', () => {
    const result = merchantTrend(sampleTransactions, 'Unknown');
    expect(result.periods).toHaveLength(0);
    expect(result.changeCents).toBe(0);
    expect(result.changePercent).toBe(0);
  });

  it('handles single period (no change)', () => {
    const result = merchantTrend(sampleTransactions, 'Gas Station');
    expect(result.periods).toHaveLength(1);
    expect(result.changeCents).toBe(0);
    expect(result.changePercent).toBe(0);
  });

  it('handles empty input', () => {
    const result = merchantTrend([], 'Coffee Shop');
    expect(result.periods).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// averageTransactionByMerchant
// ---------------------------------------------------------------------------

describe('averageTransactionByMerchant', () => {
  it('returns average per merchant', () => {
    const result = averageTransactionByMerchant(sampleTransactions);
    expect(result.get('Coffee Shop')).toBe(475);
    expect(result.get('Gas Station')).toBe(5500);
  });

  it('returns empty map for empty input', () => {
    expect(averageTransactionByMerchant([]).size).toBe(0);
  });
});
