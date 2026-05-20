// SPDX-License-Identifier: BUSL-1.1

/**
 * Transaction review queue engine.
 *
 * Provides pure functions to filter unreviewed transactions, mark them
 * as reviewed (individually or in batch), and track review progress.
 *
 * All monetary values are in integer cents. All functions are pure —
 * they return new objects and never mutate inputs.
 *
 * References: issue #1571
 */

import type {
  ReviewableTransaction,
  ReviewFilter,
  ReviewProgress,
  ReviewQueue,
} from './review-types';
import { ReviewStatus } from './review-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Apply banker's rounding (round half to even) to a number.
 *
 * @param value - The value to round.
 * @returns The rounded integer.
 */
export function bankersRound(value: number): number {
  const floored = Math.floor(value);
  const decimal = value - floored;

  if (Math.abs(decimal - 0.5) < Number.EPSILON) {
    // Round to even
    return floored % 2 === 0 ? floored : floored + 1;
  }
  return Math.round(value);
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filter transactions based on the provided criteria.
 *
 * @param transactions - The full list of reviewable transactions.
 * @param filter - Filter criteria to apply. Empty filter returns all.
 * @returns A new array containing only matching transactions.
 */
export function filterTransactions(
  transactions: readonly ReviewableTransaction[],
  filter: ReviewFilter,
): ReviewableTransaction[] {
  return transactions.filter((tx) => {
    if (filter.status !== undefined && tx.reviewStatus !== filter.status) {
      return false;
    }
    if (filter.dateFrom !== undefined && tx.date < filter.dateFrom) {
      return false;
    }
    if (filter.dateTo !== undefined && tx.date > filter.dateTo) {
      return false;
    }
    if (filter.minAmountCents !== undefined && tx.amountCents < filter.minAmountCents) {
      return false;
    }
    if (filter.maxAmountCents !== undefined && tx.amountCents > filter.maxAmountCents) {
      return false;
    }
    if (filter.categoryId !== undefined && tx.categoryId !== filter.categoryId) {
      return false;
    }
    if (
      filter.merchant !== undefined &&
      !tx.merchant.toLowerCase().includes(filter.merchant.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Review actions
// ---------------------------------------------------------------------------

/**
 * Mark a single transaction as reviewed.
 *
 * @param transactions - The current list of transactions.
 * @param transactionId - The ID of the transaction to mark.
 * @param reviewedBy - Identifier of the reviewing user.
 * @param reviewedAt - ISO 8601 timestamp of the review.
 * @returns A new array with the target transaction updated. If the ID is not
 *          found, returns a shallow copy of the original array.
 */
export function markAsReviewed(
  transactions: readonly ReviewableTransaction[],
  transactionId: string,
  reviewedBy: string,
  reviewedAt: string,
): ReviewableTransaction[] {
  return transactions.map((tx) =>
    tx.id === transactionId
      ? {
          ...tx,
          reviewStatus: ReviewStatus.Reviewed,
          reviewedAt,
          reviewedBy,
        }
      : tx,
  );
}

/**
 * Mark a single transaction as flagged for follow-up.
 *
 * @param transactions - The current list of transactions.
 * @param transactionId - The ID of the transaction to flag.
 * @param reviewedBy - Identifier of the reviewing user.
 * @param reviewedAt - ISO 8601 timestamp of the flag action.
 * @returns A new array with the target transaction flagged.
 */
export function markAsFlagged(
  transactions: readonly ReviewableTransaction[],
  transactionId: string,
  reviewedBy: string,
  reviewedAt: string,
): ReviewableTransaction[] {
  return transactions.map((tx) =>
    tx.id === transactionId
      ? {
          ...tx,
          reviewStatus: ReviewStatus.Flagged,
          reviewedAt,
          reviewedBy,
        }
      : tx,
  );
}

/**
 * Batch-mark multiple transactions as reviewed.
 *
 * @param transactions - The current list of transactions.
 * @param transactionIds - IDs of the transactions to mark.
 * @param reviewedBy - Identifier of the reviewing user.
 * @param reviewedAt - ISO 8601 timestamp of the review.
 * @returns A new array with all matching transactions updated.
 */
export function batchMarkAsReviewed(
  transactions: readonly ReviewableTransaction[],
  transactionIds: readonly string[],
  reviewedBy: string,
  reviewedAt: string,
): ReviewableTransaction[] {
  const idSet = new Set(transactionIds);
  return transactions.map((tx) =>
    idSet.has(tx.id)
      ? {
          ...tx,
          reviewStatus: ReviewStatus.Reviewed,
          reviewedAt,
          reviewedBy,
        }
      : tx,
  );
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/**
 * Calculate review progress for a list of transactions.
 *
 * @param transactions - The transactions to summarize.
 * @returns A progress summary with counts and completion percentage.
 */
export function calculateProgress(transactions: readonly ReviewableTransaction[]): ReviewProgress {
  const total = transactions.length;
  if (total === 0) {
    return { total: 0, reviewed: 0, unreviewed: 0, flagged: 0, completionPercent: 0 };
  }

  let reviewed = 0;
  let flagged = 0;

  for (const tx of transactions) {
    if (tx.reviewStatus === ReviewStatus.Reviewed) {
      reviewed++;
    } else if (tx.reviewStatus === ReviewStatus.Flagged) {
      flagged++;
    }
  }

  const unreviewed = total - reviewed - flagged;
  const completionPercent = bankersRound((reviewed / total) * 100);

  return { total, reviewed, unreviewed, flagged, completionPercent };
}

// ---------------------------------------------------------------------------
// Queue builder
// ---------------------------------------------------------------------------

/**
 * Build a complete review queue from raw transactions and a filter.
 *
 * @param transactions - All reviewable transactions.
 * @param filter - Filter to apply. Defaults to empty (all transactions).
 * @returns A ReviewQueue containing filtered transactions, progress, and the active filter.
 */
export function buildReviewQueue(
  transactions: readonly ReviewableTransaction[],
  filter: ReviewFilter = {},
): ReviewQueue {
  const filtered = filterTransactions(transactions, filter);
  const progress = calculateProgress(filtered);
  return { transactions: filtered, progress, filter };
}
