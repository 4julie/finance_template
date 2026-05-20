// ---------------------------------------------------------------------------
// Tests — Bulk Operations (#1573)
// ---------------------------------------------------------------------------

import { describe, expect, it } from 'vitest';
import type { BulkEditRequest, RecategorizationRule, Transaction } from './types';
import {
  bankersRound,
  bulkEditApply,
  bulkEditPreview,
  bulkRecategorize,
  matchesCriteria,
  selectTransactions,
} from './bulk-operations';

// ── Fixtures ───────────────────────────────────────────────────────────────

const txs: readonly Transaction[] = [
  {
    id: '1',
    merchant: 'Starbucks',
    category: 'Coffee',
    amountCents: 450,
    date: '2024-03-15',
    tags: ['morning'],
    note: '',
  },
  {
    id: '2',
    merchant: 'Amazon',
    category: 'Shopping',
    amountCents: 2999,
    date: '2024-04-01',
    tags: [],
    note: 'Book order',
  },
  {
    id: '3',
    merchant: 'starbucks reserve',
    category: 'Coffee',
    amountCents: 650,
    date: '2024-04-10',
    tags: ['morning', 'weekend'],
    note: '',
  },
  {
    id: '4',
    merchant: 'Shell Gas',
    category: 'Fuel',
    amountCents: 5200,
    date: '2024-05-01',
    tags: ['commute'],
    note: '',
  },
];

// ── bankersRound ───────────────────────────────────────────────────────────

describe('bankersRound', () => {
  it('rounds 0.5 to nearest even (down)', () => {
    expect(bankersRound(2.5)).toBe(2);
  });

  it('rounds 0.5 to nearest even (up)', () => {
    expect(bankersRound(3.5)).toBe(4);
  });

  it('rounds normal fractions normally', () => {
    expect(bankersRound(2.3)).toBe(2);
    expect(bankersRound(2.7)).toBe(3);
  });

  it('handles negative halves', () => {
    expect(bankersRound(4.5)).toBe(4);
    expect(bankersRound(5.5)).toBe(6);
  });
});

// ── matchesCriteria ────────────────────────────────────────────────────────

describe('matchesCriteria', () => {
  it('matches by merchant pattern (case-insensitive)', () => {
    expect(matchesCriteria(txs[0], { merchantPattern: 'starbucks' })).toBe(true);
    expect(matchesCriteria(txs[2], { merchantPattern: 'STARBUCKS' })).toBe(true);
    expect(matchesCriteria(txs[1], { merchantPattern: 'starbucks' })).toBe(false);
  });

  it('matches by category', () => {
    expect(matchesCriteria(txs[0], { category: 'Coffee' })).toBe(true);
    expect(matchesCriteria(txs[1], { category: 'Coffee' })).toBe(false);
  });

  it('matches by date range', () => {
    expect(matchesCriteria(txs[0], { dateFrom: '2024-03-01', dateTo: '2024-03-31' })).toBe(true);
    expect(matchesCriteria(txs[1], { dateFrom: '2024-03-01', dateTo: '2024-03-31' })).toBe(false);
  });

  it('matches by transaction IDs', () => {
    expect(matchesCriteria(txs[0], { transactionIds: ['1', '3'] })).toBe(true);
    expect(matchesCriteria(txs[1], { transactionIds: ['1', '3'] })).toBe(false);
  });

  it('matches by amount range', () => {
    expect(matchesCriteria(txs[0], { minAmountCents: 400, maxAmountCents: 500 })).toBe(true);
    expect(matchesCriteria(txs[1], { minAmountCents: 400, maxAmountCents: 500 })).toBe(false);
  });

  it('matches all criteria combined', () => {
    expect(
      matchesCriteria(txs[0], {
        merchantPattern: 'star',
        category: 'Coffee',
        dateFrom: '2024-01-01',
        minAmountCents: 100,
      }),
    ).toBe(true);
  });

  it('empty criteria matches everything', () => {
    expect(matchesCriteria(txs[0], {})).toBe(true);
  });
});

// ── selectTransactions ─────────────────────────────────────────────────────

describe('selectTransactions', () => {
  it('returns only matching transactions', () => {
    const result = selectTransactions(txs, { merchantPattern: 'starbucks' });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['1', '3']);
  });
});

// ── bulkEditPreview ────────────────────────────────────────────────────────

describe('bulkEditPreview', () => {
  it('shows recategorisation preview', () => {
    const req: BulkEditRequest = {
      criteria: { merchantPattern: 'starbucks' },
      action: { type: 'recategorize', newCategory: 'Café' },
    };
    const summary = bulkEditPreview(txs, req);
    expect(summary.matchedCount).toBe(2);
    expect(summary.affectedCount).toBe(2);
    expect(summary.totalAmountAffectedCents).toBe(450 + 650);
    expect(summary.previews[0].oldValue).toBe('Coffee');
    expect(summary.previews[0].newValue).toBe('Café');
  });

  it('does not count no-change transactions as affected', () => {
    const req: BulkEditRequest = {
      criteria: { merchantPattern: 'starbucks' },
      action: { type: 'recategorize', newCategory: 'Coffee' },
    };
    const summary = bulkEditPreview(txs, req);
    expect(summary.matchedCount).toBe(2);
    expect(summary.affectedCount).toBe(0);
  });

  it('shows tag application preview', () => {
    const req: BulkEditRequest = {
      criteria: { category: 'Coffee' },
      action: { type: 'applyTag', tag: 'caffeine' },
    };
    const summary = bulkEditPreview(txs, req);
    expect(summary.affectedCount).toBe(2);
  });

  it('skips tag application if already present', () => {
    const req: BulkEditRequest = {
      criteria: { transactionIds: ['1'] },
      action: { type: 'applyTag', tag: 'morning' },
    };
    const summary = bulkEditPreview(txs, req);
    expect(summary.affectedCount).toBe(0);
  });

  it('shows amount adjustment preview', () => {
    const req: BulkEditRequest = {
      criteria: { transactionIds: ['2'] },
      action: { type: 'adjustAmount', deltaAmountCents: -500 },
    };
    const summary = bulkEditPreview(txs, req);
    expect(summary.affectedCount).toBe(1);
    expect(summary.previews[0].oldValue).toBe(2999);
    expect(summary.previews[0].newValue).toBe(2499);
  });
});

// ── bulkEditApply ──────────────────────────────────────────────────────────

describe('bulkEditApply', () => {
  it('applies recategorisation and returns updated transactions', () => {
    const req: BulkEditRequest = {
      criteria: { merchantPattern: 'starbucks' },
      action: { type: 'recategorize', newCategory: 'Café' },
    };
    const [updated, summary] = bulkEditApply(txs, req);
    expect(summary.affectedCount).toBe(2);
    expect(updated.find((t) => t.id === '1')!.category).toBe('Café');
    expect(updated.find((t) => t.id === '3')!.category).toBe('Café');
    // Unmatched unchanged
    expect(updated.find((t) => t.id === '2')!.category).toBe('Shopping');
  });

  it('applies note change', () => {
    const req: BulkEditRequest = {
      criteria: { transactionIds: ['4'] },
      action: { type: 'applyNote', note: 'Monthly gas' },
    };
    const [updated] = bulkEditApply(txs, req);
    expect(updated.find((t) => t.id === '4')!.note).toBe('Monthly gas');
  });

  it('removes a tag', () => {
    const req: BulkEditRequest = {
      criteria: { transactionIds: ['3'] },
      action: { type: 'removeTag', tag: 'morning' },
    };
    const [updated, summary] = bulkEditApply(txs, req);
    expect(summary.affectedCount).toBe(1);
    expect(updated.find((t) => t.id === '3')!.tags).toEqual(['weekend']);
  });
});

// ── bulkRecategorize ───────────────────────────────────────────────────────

describe('bulkRecategorize', () => {
  it('applies first matching rule per transaction', () => {
    const rules: RecategorizationRule[] = [
      { criteria: { merchantPattern: 'starbucks' }, newCategory: 'Café' },
      { criteria: { category: 'Shopping' }, newCategory: 'Online Shopping' },
    ];
    const [updated, summary] = bulkRecategorize(txs, rules);
    expect(summary.affectedCount).toBe(3);
    expect(updated.find((t) => t.id === '1')!.category).toBe('Café');
    expect(updated.find((t) => t.id === '2')!.category).toBe('Online Shopping');
    expect(updated.find((t) => t.id === '4')!.category).toBe('Fuel');
  });
});
