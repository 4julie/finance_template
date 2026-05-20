// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { computeDelta } from '../delta';
import type { ExistingTransaction } from '../reconciliation';
import type { ParsedTransaction } from '../types';

function makeImported(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
  return {
    date: '2024-01-15',
    amountCents: -4567,
    description: 'GROCERY STORE',
    sourceId: null,
    category: null,
    checkNumber: null,
    type: null,
    memo: null,
    balanceCents: null,
    rawFields: {},
    ...overrides,
  };
}

function makeExisting(overrides: Partial<ExistingTransaction> = {}): ExistingTransaction {
  return {
    id: 'ext-001',
    date: '2024-01-15',
    amountCents: -4567,
    description: 'GROCERY STORE',
    sourceId: null,
    ...overrides,
  };
}

describe('computeDelta', () => {
  it('detects new transactions', () => {
    const imported = [makeImported()];
    const existing: ExistingTransaction[] = [];

    const delta = computeDelta(imported, existing);
    expect(delta.newTransactions).toHaveLength(1);
    expect(delta.summary.newCount).toBe(1);
  });

  it('detects deleted transactions', () => {
    const imported: ParsedTransaction[] = [];
    const existing = [makeExisting()];

    const delta = computeDelta(imported, existing);
    expect(delta.deletedTransactions).toHaveLength(1);
    expect(delta.summary.deletedCount).toBe(1);
  });

  it('detects unchanged transactions', () => {
    const imported = [makeImported()];
    const existing = [makeExisting()];

    const delta = computeDelta(imported, existing);
    expect(delta.unchangedTransactions).toHaveLength(1);
    expect(delta.summary.unchangedCount).toBe(1);
  });

  it('detects modified transactions (description changed)', () => {
    const imported = [makeImported({ description: 'UPDATED GROCERY STORE' })];
    const existing = [makeExisting()];

    const delta = computeDelta(imported, existing);
    expect(delta.modifiedTransactions).toHaveLength(1);
    expect(delta.modifiedTransactions[0].changedFields).toContain('description');
  });

  it('detects modified transactions (amount changed)', () => {
    const imported = [makeImported({ sourceId: 'SRC1', amountCents: -5000 })];
    const existing = [makeExisting({ sourceId: 'SRC1', amountCents: -4567 })];

    const delta = computeDelta(imported, existing);
    expect(delta.modifiedTransactions).toHaveLength(1);
    expect(delta.modifiedTransactions[0].changedFields).toContain('amountCents');
  });

  it('matches by sourceId first', () => {
    const imported = [makeImported({ sourceId: 'FIT001', date: '2024-01-16' })];
    const existing = [makeExisting({ sourceId: 'FIT001', date: '2024-01-15' })];

    const delta = computeDelta(imported, existing);
    expect(delta.modifiedTransactions).toHaveLength(1);
    expect(delta.modifiedTransactions[0].changedFields).toContain('date');
    expect(delta.newTransactions).toHaveLength(0);
  });

  it('falls back to date+amount matching when no sourceId', () => {
    const imported = [makeImported()];
    const existing = [makeExisting()];

    const delta = computeDelta(imported, existing);
    expect(delta.unchangedTransactions).toHaveLength(1);
  });

  it('handles mixed new/modified/deleted/unchanged', () => {
    const imported = [
      makeImported({ sourceId: 'A', description: 'UPDATED' }), // modified
      makeImported({ sourceId: 'B' }), // unchanged
      makeImported({ date: '2024-02-01', amountCents: -999 }), // new
    ];
    const existing = [
      makeExisting({ sourceId: 'A', description: 'ORIGINAL' }),
      makeExisting({ sourceId: 'B' }),
      makeExisting({ id: 'ext-deleted', date: '2024-03-01', amountCents: -1 }), // deleted
    ];

    const delta = computeDelta(imported, existing);
    expect(delta.summary.modifiedCount).toBe(1);
    expect(delta.summary.unchangedCount).toBe(1);
    expect(delta.summary.newCount).toBe(1);
    expect(delta.summary.deletedCount).toBe(1);
    expect(delta.summary.total).toBe(4);
  });

  it('provides correct total count', () => {
    const imported = [makeImported(), makeImported({ date: '2024-02-01', amountCents: -100 })];
    const existing = [makeExisting()];

    const delta = computeDelta(imported, existing);
    expect(delta.summary.total).toBe(delta.entries.length);
  });
});
