// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import {
  applyMergeStrategy,
  checkDuplicates,
  computeProgress,
  createImportSession,
  prepareRollback,
  updateSessionProgress,
} from '../migration';
import type { ParsedTransaction } from '../types';

function makeTxn(overrides: Partial<ParsedTransaction> = {}): ParsedTransaction {
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

describe('createImportSession', () => {
  it('creates a session with correct defaults', () => {
    const session = createImportSession({ label: 'Test Import', fileName: 'test.csv' }, 10);

    expect(session.label).toBe('Test Import');
    expect(session.fileName).toBe('test.csv');
    expect(session.status).toBe('pending');
    expect(session.totalTransactions).toBe(10);
    expect(session.importedCount).toBe(0);
    expect(session.skippedCount).toBe(0);
    expect(session.errorCount).toBe(0);
    expect(session.mergeStrategy).toBe('skip');
    expect(session.accountId).toBe(null);
    expect(session.id).toBeTruthy();
  });

  it('accepts custom merge strategy and account ID', () => {
    const session = createImportSession(
      {
        label: 'Import',
        fileName: 'data.ofx',
        mergeStrategy: 'overwrite',
        accountId: 'acct-123',
      },
      5,
    );

    expect(session.mergeStrategy).toBe('overwrite');
    expect(session.accountId).toBe('acct-123');
  });
});

describe('updateSessionProgress', () => {
  it('returns a new session with updated counts', () => {
    const original = createImportSession({ label: 'Test', fileName: 'a.csv' }, 10);
    const updated = updateSessionProgress(original, {
      importedCount: 5,
      skippedCount: 2,
      status: 'in_progress',
    });

    expect(updated.importedCount).toBe(5);
    expect(updated.skippedCount).toBe(2);
    expect(updated.status).toBe('in_progress');
    // Original unchanged
    expect(original.importedCount).toBe(0);
  });

  it('preserves unspecified fields', () => {
    const original = createImportSession(
      { label: 'Test', fileName: 'a.csv', mergeStrategy: 'keep_both' },
      10,
    );
    const updated = updateSessionProgress(original, { importedCount: 1 });
    expect(updated.mergeStrategy).toBe('keep_both');
    expect(updated.label).toBe('Test');
  });
});

describe('computeProgress', () => {
  it('computes percentage correctly', () => {
    const session = updateSessionProgress(
      createImportSession({ label: 'Test', fileName: 'a.csv' }, 10),
      { importedCount: 5, skippedCount: 2, errorCount: 1, status: 'in_progress' },
    );

    const progress = computeProgress(session);
    expect(progress.processed).toBe(8);
    expect(progress.total).toBe(10);
    expect(progress.percentage).toBe(80);
    expect(progress.cancellable).toBe(true);
  });

  it('shows 0% for pending session', () => {
    const session = createImportSession({ label: 'Test', fileName: 'a.csv' }, 10);
    const progress = computeProgress(session);
    expect(progress.percentage).toBe(0);
    expect(progress.message).toContain('Waiting');
  });

  it('shows completed message', () => {
    const session = updateSessionProgress(
      createImportSession({ label: 'Test', fileName: 'a.csv' }, 5),
      { importedCount: 4, skippedCount: 1, status: 'completed' },
    );

    const progress = computeProgress(session);
    expect(progress.percentage).toBe(100);
    expect(progress.message).toContain('complete');
    expect(progress.cancellable).toBe(false);
  });
});

describe('prepareRollback', () => {
  it('marks session as rolled back and returns IDs', () => {
    const session = updateSessionProgress(
      createImportSession({ label: 'Test', fileName: 'a.csv' }, 3),
      { status: 'completed', createdTransactionIds: ['t1', 't2', 't3'] },
    );

    const { session: rolledBack, transactionIdsToRemove } = prepareRollback(session);
    expect(rolledBack.status).toBe('rolled_back');
    expect(transactionIdsToRemove).toEqual(['t1', 't2', 't3']);
  });
});

describe('checkDuplicates', () => {
  it('detects duplicates by source ID', () => {
    const transactions = [makeTxn({ sourceId: 'FIT001' })];
    const previous = [makeTxn({ sourceId: 'FIT001' })];

    const results = checkDuplicates(transactions, previous, 'session-1');
    expect(results).toHaveLength(1);
    expect(results[0].isDuplicate).toBe(true);
    expect(results[0].existingSessionId).toBe('session-1');
  });

  it('detects duplicates by transaction signature', () => {
    const transactions = [makeTxn()];
    const previous = [makeTxn()]; // Same date, amount, description

    const results = checkDuplicates(transactions, previous, 'session-1');
    expect(results[0].isDuplicate).toBe(true);
  });

  it('marks non-duplicates correctly', () => {
    const transactions = [makeTxn({ amountCents: -9999 })];
    const previous = [makeTxn()];

    const results = checkDuplicates(transactions, previous, 'session-1');
    expect(results[0].isDuplicate).toBe(false);
    expect(results[0].existingSessionId).toBe(null);
  });

  it('handles empty previous list', () => {
    const transactions = [makeTxn()];
    const results = checkDuplicates(transactions, [], 'session-1');
    expect(results[0].isDuplicate).toBe(false);
  });
});

describe('applyMergeStrategy', () => {
  const txn1 = makeTxn({ sourceId: 'F1' });
  const txn2 = makeTxn({ amountCents: -9999 });
  const dupResults = [
    {
      transaction: txn1,
      isDuplicate: true,
      existingSessionId: 'old' as const,
      reason: 'dup',
    },
    {
      transaction: txn2,
      isDuplicate: false,
      existingSessionId: null,
      reason: 'none',
    },
  ];

  it('skip strategy excludes duplicates', () => {
    const { toImport, toSkip } = applyMergeStrategy([txn1, txn2], dupResults, 'skip');
    expect(toImport).toHaveLength(1);
    expect(toSkip).toHaveLength(1);
    expect(toImport[0]).toBe(txn2);
  });

  it('overwrite strategy includes duplicates', () => {
    const { toImport, toSkip } = applyMergeStrategy([txn1, txn2], dupResults, 'overwrite');
    expect(toImport).toHaveLength(2);
    expect(toSkip).toHaveLength(0);
  });

  it('keep_both strategy includes duplicates', () => {
    const { toImport, toSkip } = applyMergeStrategy([txn1, txn2], dupResults, 'keep_both');
    expect(toImport).toHaveLength(2);
    expect(toSkip).toHaveLength(0);
  });
});
