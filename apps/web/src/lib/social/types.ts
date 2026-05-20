// SPDX-License-Identifier: BUSL-1.1

/**
 * Core types for social spending benchmarks, contextual insights,
 * and transaction notes.
 *
 * All monetary values are in integer cents. No floating-point dollars.
 *
 * References: #1817, #1634, #1626
 */

// ---------------------------------------------------------------------------
// Benchmark Types (#1817)
// ---------------------------------------------------------------------------

/** Spending categories aligned with BLS Consumer Expenditure Survey. */
export type BenchmarkCategory =
  | 'housing'
  | 'food'
  | 'transport'
  | 'entertainment'
  | 'healthcare'
  | 'education'
  | 'utilities'
  | 'personal-care'
  | 'clothing'
  | 'savings'
  | 'debt-payments'
  | 'other';

/** Age range bracket for peer grouping. */
export interface AgeRange {
  readonly min: number;
  readonly max: number;
}

/** Annual household income bracket in cents. */
export interface IncomeBracket {
  readonly minCents: number;
  readonly maxCents: number;
}

/** Peer group definition for benchmark comparisons. */
export interface PeerGroup {
  readonly ageRange: AgeRange;
  readonly incomeBracket: IncomeBracket;
  readonly location: string;
  readonly householdSize: number;
}

/** Statistical distribution data for a single category. */
export interface BenchmarkData {
  readonly category: BenchmarkCategory;
  readonly peerGroup: PeerGroup;
  /** Sorted array of observed spending values in cents. */
  readonly distributionCents: readonly number[];
  /** Median spending in cents. */
  readonly medianCents: number;
  /** Mean spending in cents. */
  readonly meanCents: number;
}

/** Result of a percentile calculation. */
export interface PercentileResult {
  /** Value that was evaluated, in cents. */
  readonly valueCents: number;
  /** Percentile rank (0–100). */
  readonly percentile: number;
}

/** Side-by-side comparison of user spend vs. peer group. */
export interface BenchmarkComparison {
  readonly category: BenchmarkCategory;
  readonly userSpendCents: number;
  readonly peerMedianCents: number;
  readonly peerMeanCents: number;
  readonly percentile: number;
  /** Positive = user spends more than median; negative = less. */
  readonly differenceFromMedianCents: number;
}

/** Pre-loaded BLS statistical table entry. */
export interface BlsTableEntry {
  readonly category: BenchmarkCategory;
  readonly peerGroup: PeerGroup;
  readonly medianCents: number;
  readonly meanCents: number;
  readonly p25Cents: number;
  readonly p75Cents: number;
  readonly sampleSize: number;
}

/** Anonymized spending summary safe for social sharing. */
export interface AnonymizedSpendingSummary {
  readonly category: BenchmarkCategory;
  /** Amount rounded to nearest $50 (5000 cents) with noise. */
  readonly roundedAmountCents: number;
  /** Month label, e.g. "2024-01". No day granularity. */
  readonly month: string;
}

// ---------------------------------------------------------------------------
// Insight Types (#1634)
// ---------------------------------------------------------------------------

/** Categories of contextual financial insights. */
export type InsightType =
  | 'spending-spike'
  | 'savings-opportunity'
  | 'budget-on-track'
  | 'unusual-merchant'
  | 'recurring-detected'
  | 'goal-progress'
  | 'category-shift';

/** Severity / urgency of an insight. */
export type InsightSeverity = 'info' | 'warning' | 'success' | 'critical';

/** A generated contextual insight. */
export interface Insight {
  readonly id: string;
  readonly type: InsightType;
  readonly title: string;
  readonly body: string;
  readonly severity: InsightSeverity;
  /** Optional deep-link URL within the app. */
  readonly actionUrl: string | null;
  /** ISO-8601 timestamp of when the insight was generated. */
  readonly generatedAt: string;
  /** Relevance score (higher = more relevant), 0–100. */
  readonly relevanceScore: number;
}

/** Dismiss/snooze state for an insight card. */
export type CardState = 'active' | 'dismissed' | 'snoozed';

/** Swipeable insight card for UI presentation. */
export interface InsightCard {
  readonly insight: Insight;
  readonly state: CardState;
  /** ISO-8601 timestamp of snooze expiration, if snoozed. */
  readonly snoozeUntil: string | null;
  /** Deep-link target for the card action button. */
  readonly deepLinkTarget: string | null;
}

// ---------------------------------------------------------------------------
// Transaction Notes Types (#1626)
// ---------------------------------------------------------------------------

/** Supported attachment MIME types. */
export type AttachmentFileType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

/** A text note attached to a transaction. */
export interface TransactionNote {
  readonly id: string;
  readonly transactionId: string;
  readonly text: string;
  /** Author ID for household multi-user support. */
  readonly authorId: string;
  /** Tags for filtering (e.g. ["receipt", "business"]). */
  readonly tags: readonly string[];
  /** ISO-8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO-8601 last-updated timestamp. */
  readonly updatedAt: string;
}

/** Metadata for a receipt or document attachment. */
export interface AttachmentMetadata {
  readonly id: string;
  readonly noteId: string;
  readonly fileType: AttachmentFileType;
  /** File size in bytes. */
  readonly sizeBytes: number;
  /** Reference key for the full-size file in storage. */
  readonly storageRef: string;
  /** Reference key for the thumbnail, if available. */
  readonly thumbnailRef: string | null;
  /** Original file name. */
  readonly fileName: string;
  /** ISO-8601 upload timestamp. */
  readonly uploadedAt: string;
}

/** Input for creating a new note. */
export interface CreateNoteInput {
  readonly transactionId: string;
  readonly text: string;
  readonly authorId: string;
  readonly tags?: readonly string[];
}

/** Input for updating an existing note. */
export interface UpdateNoteInput {
  readonly text?: string;
  readonly tags?: readonly string[];
}

/** Search filters for notes. */
export interface NoteSearchFilters {
  /** Keyword to match against note text. */
  readonly keyword?: string;
  /** Tags to filter by (AND logic). */
  readonly tags?: readonly string[];
  /** ISO-8601 start date (inclusive). */
  readonly dateFrom?: string;
  /** ISO-8601 end date (inclusive). */
  readonly dateTo?: string;
}

/** A search result with relevance ranking. */
export interface NoteSearchResult {
  readonly note: TransactionNote;
  /** Relevance score, higher is more relevant. */
  readonly relevanceScore: number;
}

// ---------------------------------------------------------------------------
// Scoring Types (#1634)
// ---------------------------------------------------------------------------

/** Weights for insight relevance scoring. */
export interface ScoringWeights {
  readonly recency: number;
  readonly magnitude: number;
  readonly novelty: number;
  readonly actionability: number;
}

// ---------------------------------------------------------------------------
// Storage Model Types (#1626)
// ---------------------------------------------------------------------------

/** Conflict resolution strategy. */
export type ConflictStrategy = 'last-write-wins' | 'field-merge';

/** Result of a sync conflict resolution. */
export interface ConflictResolution<T> {
  readonly resolved: T;
  readonly strategy: ConflictStrategy;
  readonly hadConflict: boolean;
}
