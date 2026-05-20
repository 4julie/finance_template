// SPDX-License-Identifier: BUSL-1.1

/**
 * Type definitions for the transaction review queue system.
 *
 * Provides enums and interfaces for tracking review status,
 * filtering review queues, and reporting review progress.
 *
 * All monetary values are in integer cents.
 *
 * References: issue #1571
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** Status of a transaction's review lifecycle. */
export enum ReviewStatus {
  /** Transaction has not been reviewed yet. */
  Unreviewed = 'unreviewed',
  /** Transaction has been reviewed and approved. */
  Reviewed = 'reviewed',
  /** Transaction has been flagged for follow-up. */
  Flagged = 'flagged',
}

// ---------------------------------------------------------------------------
// Core types
// ---------------------------------------------------------------------------

/** A transaction augmented with review metadata. */
export interface ReviewableTransaction {
  /** Unique transaction identifier. */
  readonly id: string;
  /** Transaction date as ISO 8601 string (YYYY-MM-DD). */
  readonly date: string;
  /** Merchant or payee name. */
  readonly merchant: string;
  /** Transaction amount in cents (positive = expense, negative = income). */
  readonly amountCents: number;
  /** Category identifier. */
  readonly categoryId: string;
  /** Optional description or memo. */
  readonly description: string;
  /** Current review status. */
  readonly reviewStatus: ReviewStatus;
  /** ISO 8601 timestamp of when the transaction was reviewed, or null. */
  readonly reviewedAt: string | null;
  /** Identifier of the user who reviewed, or null. */
  readonly reviewedBy: string | null;
}

/** Filter criteria for the review queue. */
export interface ReviewFilter {
  /** Filter by review status. When undefined, includes all statuses. */
  readonly status?: ReviewStatus;
  /** Include only transactions on or after this date (ISO 8601). */
  readonly dateFrom?: string;
  /** Include only transactions on or before this date (ISO 8601). */
  readonly dateTo?: string;
  /** Minimum transaction amount in cents (inclusive). */
  readonly minAmountCents?: number;
  /** Maximum transaction amount in cents (inclusive). */
  readonly maxAmountCents?: number;
  /** Filter by category identifier. */
  readonly categoryId?: string;
  /** Filter by merchant name (case-insensitive substring match). */
  readonly merchant?: string;
}

/** Summary of review progress for a set of transactions. */
export interface ReviewProgress {
  /** Total number of transactions in the set. */
  readonly total: number;
  /** Number of reviewed transactions. */
  readonly reviewed: number;
  /** Number of unreviewed transactions. */
  readonly unreviewed: number;
  /** Number of flagged transactions. */
  readonly flagged: number;
  /** Completion percentage (0–100), 0 when total is 0. */
  readonly completionPercent: number;
}

/** The full review queue state. */
export interface ReviewQueue {
  /** Transactions matching the current filter. */
  readonly transactions: readonly ReviewableTransaction[];
  /** Current progress summary. */
  readonly progress: ReviewProgress;
  /** Active filter criteria. */
  readonly filter: ReviewFilter;
}
