// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  dollarsToCents,
  bankersRound,
  normalizeDate,
  mapCategory,
  mapAccountType,
  normalizeTransaction,
  normalizeAccount,
  deduplicateTransactions,
} from '../transaction-normalizer';
import type { BankTransaction } from '../types';

// ---------------------------------------------------------------------------
// dollarsToCents
// ---------------------------------------------------------------------------

describe('dollarsToCents', () => {
  it('converts whole dollars', () => {
    expect(dollarsToCents(1)).toBe(100);
    expect(dollarsToCents(0)).toBe(0);
    expect(dollarsToCents(100)).toBe(10000);
  });

  it('converts fractional dollars', () => {
    expect(dollarsToCents(1.5)).toBe(150);
    expect(dollarsToCents(19.99)).toBe(1999);
    expect(dollarsToCents(0.01)).toBe(1);
  });

  it('handles negative amounts', () => {
    expect(dollarsToCents(-42.5)).toBe(-4250);
    expect(dollarsToCents(-0.01)).toBe(-1);
  });

  it('handles sub-cent values with Bankers rounding', () => {
    // 12.345 * 100 = 1234.5 → round to even → 1234
    expect(dollarsToCents(12.345)).toBe(1234);
    // 12.355 * 100 = 1235.5 → round to even → 1236
    expect(dollarsToCents(12.355)).toBe(1236);
  });
});

// ---------------------------------------------------------------------------
// bankersRound
// ---------------------------------------------------------------------------

describe('bankersRound', () => {
  it('rounds down when below halfway', () => {
    expect(bankersRound(2.3)).toBe(2);
  });

  it('rounds up when above halfway', () => {
    expect(bankersRound(2.7)).toBe(3);
  });

  it('rounds half to even (down for even floor)', () => {
    expect(bankersRound(2.5)).toBe(2);
    expect(bankersRound(4.5)).toBe(4);
  });

  it('rounds half to even (up for odd floor)', () => {
    expect(bankersRound(3.5)).toBe(4);
    expect(bankersRound(5.5)).toBe(6);
  });

  it('handles negative values', () => {
    // -2.5: floor = -3, diff = 0.5, floor(-3) is odd → round to -2
    // Actually for negative: Math.floor(-2.5) = -3, diff = -2.5 - (-3) = 0.5
    // -3 % 2 = -1 (odd) → -3 + 1 = -2
    expect(bankersRound(-2.5)).toBe(-2);
  });
});

// ---------------------------------------------------------------------------
// normalizeDate
// ---------------------------------------------------------------------------

describe('normalizeDate', () => {
  it('normalizes ISO date strings', () => {
    expect(normalizeDate('2024-03-15')).toBe('2024-03-15');
  });

  it('normalizes ISO datetime strings', () => {
    expect(normalizeDate('2024-03-15T12:30:00Z')).toBe('2024-03-15');
  });

  it('normalizes US-format dates (M/D/Y)', () => {
    expect(normalizeDate('3/15/2024')).toBe('2024-03-15');
    expect(normalizeDate('12/1/2024')).toBe('2024-12-01');
  });

  it('normalizes Date objects', () => {
    const d = new Date('2024-06-01T00:00:00Z');
    expect(normalizeDate(d)).toBe('2024-06-01');
  });

  it('normalizes Unix timestamps', () => {
    const ts = new Date('2024-01-01').getTime();
    expect(normalizeDate(ts)).toBe('2024-01-01');
  });

  it('returns today for undefined/invalid input', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(normalizeDate(undefined)).toBe(today);
    expect(normalizeDate('not-a-date')).toBe(today);
  });
});

// ---------------------------------------------------------------------------
// mapCategory
// ---------------------------------------------------------------------------

describe('mapCategory', () => {
  it('maps known categories', () => {
    expect(mapCategory('Groceries')).toBe('groceries');
    expect(mapCategory('Food and Drink')).toBe('food_and_drink');
    expect(mapCategory('TRANSPORTATION')).toBe('transportation');
    expect(mapCategory('income')).toBe('income');
  });

  it('returns uncategorized for unknown categories', () => {
    expect(mapCategory('Intergalactic Travel')).toBe('uncategorized');
  });

  it('returns uncategorized for undefined/empty', () => {
    expect(mapCategory(undefined)).toBe('uncategorized');
    expect(mapCategory('')).toBe('uncategorized');
  });
});

// ---------------------------------------------------------------------------
// mapAccountType
// ---------------------------------------------------------------------------

describe('mapAccountType', () => {
  it('maps known account types', () => {
    expect(mapAccountType('checking')).toBe('checking');
    expect(mapAccountType('Savings')).toBe('savings');
    expect(mapAccountType('credit card')).toBe('credit_card');
    expect(mapAccountType('Investment')).toBe('investment');
    expect(mapAccountType('loan')).toBe('loan');
  });

  it('returns other for unknown types', () => {
    expect(mapAccountType('prepaid')).toBe('other');
    expect(mapAccountType(undefined)).toBe('other');
  });
});

// ---------------------------------------------------------------------------
// normalizeTransaction
// ---------------------------------------------------------------------------

describe('normalizeTransaction', () => {
  it('converts dollar amounts to cents', () => {
    const tx = normalizeTransaction(
      { id: 'tx-1', amount: 42.99, date: '2024-01-15', description: 'Test' },
      'plaid',
    );
    expect(tx.amountCents).toBe(4299);
  });

  it('preserves amountCents when provided', () => {
    const tx = normalizeTransaction({ id: 'tx-1', amountCents: 1234, date: '2024-01-15' }, 'plaid');
    expect(tx.amountCents).toBe(1234);
  });

  it('maps categories', () => {
    const tx = normalizeTransaction({ id: 'tx-1', category: 'Groceries' }, 'plaid');
    expect(tx.category).toBe('groceries');
  });

  it('handles missing fields gracefully', () => {
    const tx = normalizeTransaction({}, 'plaid');
    expect(tx.amountCents).toBe(0);
    expect(tx.description).toBe('Unknown');
    expect(tx.pending).toBe(false);
    expect(tx.providerTransactionId).toContain('plaid');
  });
});

// ---------------------------------------------------------------------------
// normalizeAccount
// ---------------------------------------------------------------------------

describe('normalizeAccount', () => {
  it('normalizes a complete account', () => {
    const acct = normalizeAccount(
      {
        id: 'acct-1',
        name: 'My Checking',
        type: 'depository',
        currency: 'usd',
        institution: 'Chase',
        mask: '4521',
      },
      'plaid',
    );
    expect(acct.name).toBe('My Checking');
    expect(acct.type).toBe('checking'); // depository → checking
    expect(acct.currency).toBe('USD'); // uppercased
    expect(acct.mask).toBe('4521');
  });

  it('handles missing fields with defaults', () => {
    const acct = normalizeAccount({}, 'manual');
    expect(acct.name).toBe('Unnamed Account');
    expect(acct.type).toBe('other');
    expect(acct.currency).toBe('USD');
    expect(acct.institution).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// deduplicateTransactions
// ---------------------------------------------------------------------------

describe('deduplicateTransactions', () => {
  it('removes duplicates by provider transaction ID', () => {
    const txs: BankTransaction[] = [
      {
        id: '1',
        providerTransactionId: 'ptx-a',
        accountId: 'a1',
        date: '2024-01-01',
        amountCents: 100,
        description: 'First',
        pending: false,
      },
      {
        id: '2',
        providerTransactionId: 'ptx-a',
        accountId: 'a1',
        date: '2024-01-01',
        amountCents: 100,
        description: 'Duplicate',
        pending: false,
      },
      {
        id: '3',
        providerTransactionId: 'ptx-b',
        accountId: 'a1',
        date: '2024-01-02',
        amountCents: 200,
        description: 'Unique',
        pending: false,
      },
    ];

    const deduped = deduplicateTransactions(txs);
    expect(deduped).toHaveLength(2);
    expect(deduped[0].description).toBe('First'); // First occurrence wins
    expect(deduped[1].providerTransactionId).toBe('ptx-b');
  });

  it('returns empty for empty input', () => {
    expect(deduplicateTransactions([])).toEqual([]);
  });

  it('returns all when no duplicates', () => {
    const txs: BankTransaction[] = [
      {
        id: '1',
        providerTransactionId: 'a',
        accountId: 'a1',
        date: '2024-01-01',
        amountCents: 100,
        description: 'A',
        pending: false,
      },
      {
        id: '2',
        providerTransactionId: 'b',
        accountId: 'a1',
        date: '2024-01-02',
        amountCents: 200,
        description: 'B',
        pending: false,
      },
    ];
    expect(deduplicateTransactions(txs)).toHaveLength(2);
  });
});
