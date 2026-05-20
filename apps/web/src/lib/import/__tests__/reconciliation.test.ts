// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { computeMatchConfidence, reconcile } from '../reconciliation';
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

describe('reconcile', () => {
  it('matches transactions by source ID', () => {
    const imported = [makeImported({ sourceId: 'FIT001' })];
    const existing = [makeExisting({ sourceId: 'FIT001' })];

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].confidence).toBe(100);
    expect(report.matched[0].tier).toBe('exact');
    expect(report.unmatchedImported).toHaveLength(0);
    expect(report.unmatchedExisting).toHaveLength(0);
  });

  it('matches transactions by exact amount and date', () => {
    const imported = [makeImported()];
    const existing = [makeExisting()];

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].confidence).toBeGreaterThanOrEqual(80);
    expect(report.matched[0].tier).toBe('exact');
  });

  it('fuzzy matches same amount within date tolerance', () => {
    const imported = [makeImported({ date: '2024-01-15' })];
    const existing = [
      makeExisting({
        date: '2024-01-17', // 2 days later
        description: 'Grocery Store Purchase',
      }),
    ];

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].confidence).toBeGreaterThanOrEqual(50);
    expect(report.matched[0].confidence).toBeLessThan(100);
  });

  it('does not match beyond date tolerance', () => {
    const imported = [makeImported({ date: '2024-01-15' })];
    const existing = [makeExisting({ date: '2024-01-25' })]; // 10 days

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(0);
    expect(report.unmatchedImported).toHaveLength(1);
    expect(report.unmatchedExisting).toHaveLength(1);
  });

  it('does not match different amounts', () => {
    const imported = [makeImported({ amountCents: -4567 })];
    const existing = [makeExisting({ amountCents: -9999 })];

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(0);
  });

  it('handles multiple exact matches (same amount, same day) by description similarity', () => {
    const imported = [makeImported({ description: 'GROCERY STORE #123' })];
    const existing = [
      makeExisting({ id: 'ext-1', description: 'GROCERY STORE #123' }),
      makeExisting({ id: 'ext-2', description: 'GAS STATION' }),
    ];

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(1);
    expect(report.matched[0].existing.id).toBe('ext-1');
  });

  it('flags ambiguous duplicates when descriptions are similar', () => {
    const imported = [makeImported({ description: 'STORE' })];
    const existing = [
      makeExisting({ id: 'ext-1', description: 'STORE A' }),
      makeExisting({ id: 'ext-2', description: 'STORE B' }),
    ];

    const report = reconcile(imported, existing);
    // Either matched (picked best) or flagged as duplicate
    const total = report.matched.length + report.duplicates.length;
    expect(total).toBeGreaterThanOrEqual(1);
  });

  it('collects unmatched imported as new transactions', () => {
    const imported = [makeImported()];
    const existing: ExistingTransaction[] = [];

    const report = reconcile(imported, existing);
    expect(report.unmatchedImported).toHaveLength(1);
    expect(report.unmatchedImported[0].source).toBe('imported');
    expect(report.unmatchedImported[0].suggestion).toBe('create');
  });

  it('collects unmatched existing for review', () => {
    const imported: ParsedTransaction[] = [];
    const existing = [makeExisting()];

    const report = reconcile(imported, existing);
    expect(report.unmatchedExisting).toHaveLength(1);
    expect(report.unmatchedExisting[0].source).toBe('existing');
    expect(report.unmatchedExisting[0].suggestion).toBe('review');
  });

  it('provides accurate summary statistics', () => {
    const imported = [
      makeImported({ sourceId: 'F1' }),
      makeImported({ date: '2024-01-20', amountCents: -1000 }),
      makeImported({ date: '2024-02-01', amountCents: -500 }),
    ];
    const existing = [
      makeExisting({ sourceId: 'F1' }),
      makeExisting({ date: '2024-01-20', amountCents: -1000 }),
    ];

    const report = reconcile(imported, existing);
    expect(report.summary.totalImported).toBe(3);
    expect(report.summary.totalExisting).toBe(2);
    expect(report.summary.exactMatches + report.summary.fuzzyMatches).toBe(2);
    expect(report.summary.unmatchedImportedCount).toBe(1);
  });

  it('respects custom date tolerance', () => {
    const imported = [makeImported({ date: '2024-01-15' })];
    const existing = [makeExisting({ date: '2024-01-17', description: 'GROCERY STORE' })];

    const strict = reconcile(imported, existing, { dateTolerance: 1 });
    expect(strict.matched).toHaveLength(0);

    const relaxed = reconcile(imported, existing, { dateTolerance: 5 });
    expect(relaxed.matched).toHaveLength(1);
  });

  it('each transaction matches at most once (greedy)', () => {
    const imported = [
      makeImported({ amountCents: -1000 }),
      makeImported({ amountCents: -1000, description: 'DIFFERENT' }),
    ];
    const existing = [makeExisting({ amountCents: -1000 })];

    const report = reconcile(imported, existing);
    expect(report.matched).toHaveLength(1);
    expect(report.unmatchedImported).toHaveLength(1);
  });
});

describe('computeMatchConfidence', () => {
  it('returns 100 for source ID match', () => {
    const imp = makeImported({ sourceId: 'F1' });
    const ext = makeExisting({ sourceId: 'F1' });
    expect(computeMatchConfidence(imp, ext)).toBe(100);
  });

  it('returns 0 for amount mismatch', () => {
    const imp = makeImported({ amountCents: -100 });
    const ext = makeExisting({ amountCents: -200 });
    expect(computeMatchConfidence(imp, ext)).toBe(0);
  });

  it('gives high confidence for same amount + same date + similar description', () => {
    const imp = makeImported();
    const ext = makeExisting();
    const confidence = computeMatchConfidence(imp, ext);
    expect(confidence).toBeGreaterThanOrEqual(80);
  });

  it('reduces confidence for date differences', () => {
    const imp = makeImported({ date: '2024-01-15' });
    const extSameDay = makeExisting({ date: '2024-01-15' });
    const extLater = makeExisting({ date: '2024-01-17' });

    const sameDayConf = computeMatchConfidence(imp, extSameDay);
    const laterConf = computeMatchConfidence(imp, extLater);
    expect(sameDayConf).toBeGreaterThan(laterConf);
  });
});
