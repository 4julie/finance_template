// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';
import {
  filterTransactions,
  markAsReviewed,
  markAsFlagged,
  batchMarkAsReviewed,
  calculateProgress,
  buildReviewQueue,
  bankersRound,
} from './review-queue';
import { ReviewStatus } from './review-types';
import type { ReviewableTransaction } from './review-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<ReviewableTransaction> = {}): ReviewableTransaction {
  return {
    id: 'tx-1',
    date: '2024-06-15',
    merchant: 'Grocery Store',
    amountCents: 5000,
    categoryId: 'cat-food',
    description: 'Weekly groceries',
    reviewStatus: ReviewStatus.Unreviewed,
    reviewedAt: null,
    reviewedBy: null,
    ...overrides,
  };
}

const sampleTransactions: ReviewableTransaction[] = [
  makeTx({ id: 'tx-1', merchant: 'Grocery Store', amountCents: 5000, date: '2024-06-01' }),
  makeTx({
    id: 'tx-2',
    merchant: 'Gas Station',
    amountCents: 3500,
    date: '2024-06-05',
    categoryId: 'cat-transport',
  }),
  makeTx({
    id: 'tx-3',
    merchant: 'Coffee Shop',
    amountCents: 450,
    date: '2024-06-10',
    reviewStatus: ReviewStatus.Reviewed,
    reviewedAt: '2024-06-10T12:00:00Z',
    reviewedBy: 'user-1',
  }),
  makeTx({
    id: 'tx-4',
    merchant: 'Online Store',
    amountCents: 12000,
    date: '2024-06-15',
    reviewStatus: ReviewStatus.Flagged,
    reviewedAt: '2024-06-15T09:00:00Z',
    reviewedBy: 'user-1',
  }),
  makeTx({ id: 'tx-5', merchant: 'Grocery Store', amountCents: 0, date: '2024-06-20' }),
];

// ---------------------------------------------------------------------------
// bankersRound
// ---------------------------------------------------------------------------

describe('bankersRound', () => {
  it('rounds 0.5 to 0 (even)', () => {
    expect(bankersRound(0.5)).toBe(0);
  });

  it('rounds 1.5 to 2 (even)', () => {
    expect(bankersRound(1.5)).toBe(2);
  });

  it('rounds 2.5 to 2 (even)', () => {
    expect(bankersRound(2.5)).toBe(2);
  });

  it('rounds 3.5 to 4 (even)', () => {
    expect(bankersRound(3.5)).toBe(4);
  });

  it('rounds non-half values normally', () => {
    expect(bankersRound(2.3)).toBe(2);
    expect(bankersRound(2.7)).toBe(3);
  });

  it('handles negative values', () => {
    expect(bankersRound(-1.5)).toBe(-2);
  });
});

// ---------------------------------------------------------------------------
// filterTransactions
// ---------------------------------------------------------------------------

describe('filterTransactions', () => {
  it('returns all transactions for empty filter', () => {
    expect(filterTransactions(sampleTransactions, {})).toHaveLength(5);
  });

  it('filters by review status', () => {
    const result = filterTransactions(sampleTransactions, { status: ReviewStatus.Unreviewed });
    expect(result).toHaveLength(3);
    expect(result.every((tx) => tx.reviewStatus === ReviewStatus.Unreviewed)).toBe(true);
  });

  it('filters by date range', () => {
    const result = filterTransactions(sampleTransactions, {
      dateFrom: '2024-06-05',
      dateTo: '2024-06-15',
    });
    expect(result).toHaveLength(3);
  });

  it('filters by amount range', () => {
    const result = filterTransactions(sampleTransactions, {
      minAmountCents: 1000,
      maxAmountCents: 6000,
    });
    // tx-1 (5000) and tx-2 (3500) are in range; tx-3 (450) and tx-5 (0) below, tx-4 (12000) above
    expect(result).toHaveLength(2);
  });

  it('filters by category', () => {
    const result = filterTransactions(sampleTransactions, { categoryId: 'cat-transport' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tx-2');
  });

  it('filters by merchant (case-insensitive substring)', () => {
    const result = filterTransactions(sampleTransactions, { merchant: 'grocery' });
    expect(result).toHaveLength(2);
  });

  it('combines multiple filters (AND logic)', () => {
    const result = filterTransactions(sampleTransactions, {
      status: ReviewStatus.Unreviewed,
      merchant: 'grocery',
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    const result = filterTransactions(sampleTransactions, { merchant: 'Nonexistent' });
    expect(result).toHaveLength(0);
  });

  it('handles empty input array', () => {
    expect(filterTransactions([], { status: ReviewStatus.Unreviewed })).toHaveLength(0);
  });

  it('includes zero-amount transactions when in range', () => {
    const result = filterTransactions(sampleTransactions, {
      minAmountCents: 0,
      maxAmountCents: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tx-5');
  });
});

// ---------------------------------------------------------------------------
// markAsReviewed
// ---------------------------------------------------------------------------

describe('markAsReviewed', () => {
  it('marks a transaction as reviewed', () => {
    const result = markAsReviewed(sampleTransactions, 'tx-1', 'user-1', '2024-06-25T10:00:00Z');
    const updated = result.find((tx) => tx.id === 'tx-1')!;
    expect(updated.reviewStatus).toBe(ReviewStatus.Reviewed);
    expect(updated.reviewedAt).toBe('2024-06-25T10:00:00Z');
    expect(updated.reviewedBy).toBe('user-1');
  });

  it('does not mutate the original array', () => {
    const original = [...sampleTransactions];
    markAsReviewed(sampleTransactions, 'tx-1', 'user-1', '2024-06-25T10:00:00Z');
    expect(sampleTransactions).toEqual(original);
  });

  it('returns unchanged copy when ID is not found', () => {
    const result = markAsReviewed(
      sampleTransactions,
      'nonexistent',
      'user-1',
      '2024-06-25T10:00:00Z',
    );
    expect(result).toEqual(sampleTransactions);
  });

  it('handles single-element array', () => {
    const single = [makeTx({ id: 'only' })];
    const result = markAsReviewed(single, 'only', 'user-1', '2024-06-25T10:00:00Z');
    expect(result[0].reviewStatus).toBe(ReviewStatus.Reviewed);
  });
});

// ---------------------------------------------------------------------------
// markAsFlagged
// ---------------------------------------------------------------------------

describe('markAsFlagged', () => {
  it('marks a transaction as flagged', () => {
    const result = markAsFlagged(sampleTransactions, 'tx-1', 'user-1', '2024-06-25T10:00:00Z');
    const updated = result.find((tx) => tx.id === 'tx-1')!;
    expect(updated.reviewStatus).toBe(ReviewStatus.Flagged);
    expect(updated.reviewedAt).toBe('2024-06-25T10:00:00Z');
  });
});

// ---------------------------------------------------------------------------
// batchMarkAsReviewed
// ---------------------------------------------------------------------------

describe('batchMarkAsReviewed', () => {
  it('marks multiple transactions as reviewed', () => {
    const result = batchMarkAsReviewed(
      sampleTransactions,
      ['tx-1', 'tx-2'],
      'user-1',
      '2024-06-25T10:00:00Z',
    );
    expect(result.find((tx) => tx.id === 'tx-1')!.reviewStatus).toBe(ReviewStatus.Reviewed);
    expect(result.find((tx) => tx.id === 'tx-2')!.reviewStatus).toBe(ReviewStatus.Reviewed);
    // tx-3 already reviewed, should stay
    expect(result.find((tx) => tx.id === 'tx-3')!.reviewStatus).toBe(ReviewStatus.Reviewed);
    // tx-4 flagged, not in batch, should stay flagged
    expect(result.find((tx) => tx.id === 'tx-4')!.reviewStatus).toBe(ReviewStatus.Flagged);
  });

  it('handles empty ID list', () => {
    const result = batchMarkAsReviewed(sampleTransactions, [], 'user-1', '2024-06-25T10:00:00Z');
    expect(result).toEqual(sampleTransactions);
  });

  it('handles IDs not in the list', () => {
    const result = batchMarkAsReviewed(
      sampleTransactions,
      ['nonexistent'],
      'user-1',
      '2024-06-25T10:00:00Z',
    );
    expect(result).toEqual(sampleTransactions);
  });
});

// ---------------------------------------------------------------------------
// calculateProgress
// ---------------------------------------------------------------------------

describe('calculateProgress', () => {
  it('calculates correct progress for mixed statuses', () => {
    const progress = calculateProgress(sampleTransactions);
    expect(progress.total).toBe(5);
    expect(progress.reviewed).toBe(1);
    expect(progress.unreviewed).toBe(3);
    expect(progress.flagged).toBe(1);
    expect(progress.completionPercent).toBe(20);
  });

  it('returns all zeros for empty array', () => {
    const progress = calculateProgress([]);
    expect(progress.total).toBe(0);
    expect(progress.reviewed).toBe(0);
    expect(progress.unreviewed).toBe(0);
    expect(progress.flagged).toBe(0);
    expect(progress.completionPercent).toBe(0);
  });

  it('returns 100% when all reviewed', () => {
    const all = [
      makeTx({ id: 'a', reviewStatus: ReviewStatus.Reviewed }),
      makeTx({ id: 'b', reviewStatus: ReviewStatus.Reviewed }),
    ];
    expect(calculateProgress(all).completionPercent).toBe(100);
  });

  it('returns 0% when none reviewed', () => {
    const none = [
      makeTx({ id: 'a', reviewStatus: ReviewStatus.Unreviewed }),
      makeTx({ id: 'b', reviewStatus: ReviewStatus.Flagged }),
    ];
    expect(calculateProgress(none).completionPercent).toBe(0);
  });

  it('handles single transaction', () => {
    const single = [makeTx({ id: 'a', reviewStatus: ReviewStatus.Reviewed })];
    const progress = calculateProgress(single);
    expect(progress.total).toBe(1);
    expect(progress.reviewed).toBe(1);
    expect(progress.completionPercent).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// buildReviewQueue
// ---------------------------------------------------------------------------

describe('buildReviewQueue', () => {
  it('builds a queue with default (empty) filter', () => {
    const queue = buildReviewQueue(sampleTransactions);
    expect(queue.transactions).toHaveLength(5);
    expect(queue.progress.total).toBe(5);
    expect(queue.filter).toEqual({});
  });

  it('builds a queue with a status filter', () => {
    const queue = buildReviewQueue(sampleTransactions, { status: ReviewStatus.Unreviewed });
    expect(queue.transactions).toHaveLength(3);
    expect(queue.progress.total).toBe(3);
    expect(queue.progress.reviewed).toBe(0);
  });

  it('builds a queue from empty transactions', () => {
    const queue = buildReviewQueue([]);
    expect(queue.transactions).toHaveLength(0);
    expect(queue.progress.total).toBe(0);
  });
});
