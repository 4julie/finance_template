// SPDX-License-Identifier: BUSL-1.1

/**
 * Transaction reconciliation engine.
 *
 * Matches imported transactions against existing records using:
 * - Exact match: same amount + same date
 * - Fuzzy match: same amount + date within ±3 days + similar description
 * - Confidence scoring (0–100) for each match
 *
 * Designed for manual account reconciliation (#1606) where users need
 * to verify and approve matches before committing.
 *
 * Pure functions — no side effects, no database access.
 */

import { ParsedTransaction } from './types';
import { daysBetween, stringSimilarity } from './utils';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** An existing transaction in the local database (minimal fields needed for matching). */
export interface ExistingTransaction {
  /** Unique ID of the transaction in the database. */
  readonly id: string;
  /** ISO 8601 date string (YYYY-MM-DD). */
  readonly date: string;
  /** Transaction amount in integer cents (negative = outflow). */
  readonly amountCents: number;
  /** Payee or description text. */
  readonly description: string;
  /** Source-file-unique ID (e.g., OFX FITID), if previously imported. */
  readonly sourceId: string | null;
}

/** Match quality tier. */
export type MatchConfidence = 'exact' | 'high' | 'medium' | 'low';

/** A matched pair of imported and existing transactions. */
export interface TransactionMatch {
  /** The imported transaction. */
  readonly imported: ParsedTransaction;
  /** The matched existing transaction. */
  readonly existing: ExistingTransaction;
  /** Confidence score from 0 to 100. */
  readonly confidence: number;
  /** Match quality tier. */
  readonly tier: MatchConfidence;
  /** Human-readable explanation of why this match was made. */
  readonly reason: string;
}

/** A transaction that could not be matched. */
export interface UnmatchedTransaction {
  /** The unmatched transaction (either imported or existing). */
  readonly transaction: ParsedTransaction | ExistingTransaction;
  /** Whether this is an imported transaction or an existing one. */
  readonly source: 'imported' | 'existing';
  /** Suggested action for the user. */
  readonly suggestion: 'create' | 'review' | 'ignore';
}

/** A potential duplicate found during reconciliation. */
export interface DuplicateCandidate {
  /** The imported transaction. */
  readonly imported: ParsedTransaction;
  /** Multiple existing transactions that could match. */
  readonly candidates: readonly ExistingTransaction[];
  /** Reason it was flagged as ambiguous. */
  readonly reason: string;
}

/** Complete reconciliation report. */
export interface ReconciliationReport {
  /** Successfully matched transaction pairs, sorted by confidence descending. */
  readonly matched: readonly TransactionMatch[];
  /** Imported transactions with no match in existing data. */
  readonly unmatchedImported: readonly UnmatchedTransaction[];
  /** Existing transactions with no match in imported data. */
  readonly unmatchedExisting: readonly UnmatchedTransaction[];
  /** Imported transactions with multiple possible matches (ambiguous). */
  readonly duplicates: readonly DuplicateCandidate[];
  /** Summary statistics. */
  readonly summary: ReconciliationSummary;
}

/** Summary statistics for a reconciliation run. */
export interface ReconciliationSummary {
  /** Total imported transactions processed. */
  readonly totalImported: number;
  /** Total existing transactions considered. */
  readonly totalExisting: number;
  /** Number of exact matches. */
  readonly exactMatches: number;
  /** Number of fuzzy matches. */
  readonly fuzzyMatches: number;
  /** Number of unmatched imported transactions. */
  readonly unmatchedImportedCount: number;
  /** Number of unmatched existing transactions. */
  readonly unmatchedExistingCount: number;
  /** Number of ambiguous/duplicate candidates. */
  readonly duplicateCount: number;
}

/** Options for configuring reconciliation behavior. */
export interface ReconciliationOptions {
  /** Maximum number of days difference for fuzzy date matching. @default 3 */
  readonly dateTolerance?: number;
  /** Minimum description similarity (0–100) for fuzzy matching. @default 40 */
  readonly minDescriptionSimilarity?: number;
  /** Minimum overall confidence to accept a fuzzy match. @default 50 */
  readonly minConfidence?: number;
  /** Whether to match by sourceId (e.g., FITID) when available. @default true */
  readonly matchBySourceId?: boolean;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Reconcile imported transactions against existing records.
 *
 * Runs a multi-pass matching algorithm:
 * 1. Source ID match (FITID, etc.) — highest priority
 * 2. Exact match (same amount + same date)
 * 3. Fuzzy match (same amount + date within tolerance + similar description)
 *
 * Each imported and existing transaction is matched at most once (greedy).
 *
 * @param imported - Transactions parsed from an import file.
 * @param existing - Transactions already in the local database.
 * @param options - Matching configuration options.
 * @returns A complete reconciliation report.
 */
export function reconcile(
  imported: readonly ParsedTransaction[],
  existing: readonly ExistingTransaction[],
  options?: ReconciliationOptions,
): ReconciliationReport {
  const dateTolerance = options?.dateTolerance ?? 3;
  const minDescSimilarity = options?.minDescriptionSimilarity ?? 40;
  const minConfidence = options?.minConfidence ?? 50;
  const matchBySourceId = options?.matchBySourceId ?? true;

  const matched: TransactionMatch[] = [];
  const duplicates: DuplicateCandidate[] = [];

  // Track which transactions have been matched
  const matchedImportedIdx = new Set<number>();
  const matchedExistingIdx = new Set<number>();

  // Pass 1: Source ID matching
  if (matchBySourceId) {
    for (let i = 0; i < imported.length; i++) {
      if (matchedImportedIdx.has(i)) continue;
      const imp = imported[i];
      if (!imp.sourceId) continue;

      for (let j = 0; j < existing.length; j++) {
        if (matchedExistingIdx.has(j)) continue;
        const ext = existing[j];
        if (ext.sourceId === imp.sourceId) {
          matched.push({
            imported: imp,
            existing: ext,
            confidence: 100,
            tier: 'exact',
            reason: `Source ID match: ${imp.sourceId}`,
          });
          matchedImportedIdx.add(i);
          matchedExistingIdx.add(j);
          break;
        }
      }
    }
  }

  // Pass 2: Exact match (amount + date)
  for (let i = 0; i < imported.length; i++) {
    if (matchedImportedIdx.has(i)) continue;
    const imp = imported[i];

    const exactCandidates: number[] = [];
    for (let j = 0; j < existing.length; j++) {
      if (matchedExistingIdx.has(j)) continue;
      const ext = existing[j];
      if (ext.amountCents === imp.amountCents && ext.date === imp.date) {
        exactCandidates.push(j);
      }
    }

    if (exactCandidates.length === 1) {
      const ext = existing[exactCandidates[0]];
      const descScore = stringSimilarity(imp.description, ext.description);
      matched.push({
        imported: imp,
        existing: ext,
        confidence: Math.min(100, 80 + Math.round(descScore / 5)),
        tier: 'exact',
        reason: `Exact amount and date match`,
      });
      matchedImportedIdx.add(i);
      matchedExistingIdx.add(exactCandidates[0]);
    } else if (exactCandidates.length > 1) {
      // Multiple exact matches — pick the one with the best description similarity
      const scored = exactCandidates.map((j) => ({
        index: j,
        similarity: stringSimilarity(imp.description, existing[j].description),
      }));
      scored.sort((a, b) => b.similarity - a.similarity);

      // If top two are very close, flag as ambiguous
      if (scored.length >= 2 && scored[0].similarity - scored[1].similarity < 10) {
        duplicates.push({
          imported: imp,
          candidates: exactCandidates.map((j) => existing[j]),
          reason: 'Multiple transactions with same amount and date',
        });
        matchedImportedIdx.add(i);
      } else {
        const bestIdx = scored[0].index;
        matched.push({
          imported: imp,
          existing: existing[bestIdx],
          confidence: Math.min(100, 75 + Math.round(scored[0].similarity / 5)),
          tier: 'high',
          reason: `Exact amount+date, best description match (${scored[0].similarity}% similar)`,
        });
        matchedImportedIdx.add(i);
        matchedExistingIdx.add(bestIdx);
      }
    }
  }

  // Pass 3: Fuzzy match (amount + date within tolerance + description similarity)
  for (let i = 0; i < imported.length; i++) {
    if (matchedImportedIdx.has(i)) continue;
    const imp = imported[i];

    let bestMatch: { index: number; confidence: number; reason: string } | null = null;

    for (let j = 0; j < existing.length; j++) {
      if (matchedExistingIdx.has(j)) continue;
      const ext = existing[j];

      // Amount must match exactly
      if (ext.amountCents !== imp.amountCents) continue;

      // Date must be within tolerance
      const dateDiff = daysBetween(imp.date, ext.date);
      if (dateDiff > dateTolerance) continue;

      // Description similarity
      const descScore = stringSimilarity(imp.description, ext.description);
      if (descScore < minDescSimilarity) continue;

      // Compute overall confidence
      const dateScore = Math.round(((dateTolerance - dateDiff) / dateTolerance) * 30);
      const confidence = 40 + dateScore + Math.round(descScore * 0.3);

      if (confidence >= minConfidence && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          index: j,
          confidence: Math.min(100, confidence),
          reason: `Fuzzy match: amount exact, date ±${dateDiff}d, description ${descScore}% similar`,
        };
      }
    }

    if (bestMatch) {
      const tier: MatchConfidence =
        bestMatch.confidence >= 80 ? 'high' : bestMatch.confidence >= 60 ? 'medium' : 'low';
      matched.push({
        imported: imp,
        existing: existing[bestMatch.index],
        confidence: bestMatch.confidence,
        tier,
        reason: bestMatch.reason,
      });
      matchedImportedIdx.add(i);
      matchedExistingIdx.add(bestMatch.index);
    }
  }

  // Collect unmatched
  const unmatchedImported: UnmatchedTransaction[] = [];
  for (let i = 0; i < imported.length; i++) {
    if (!matchedImportedIdx.has(i)) {
      unmatchedImported.push({
        transaction: imported[i],
        source: 'imported',
        suggestion: 'create',
      });
    }
  }

  const unmatchedExisting: UnmatchedTransaction[] = [];
  for (let j = 0; j < existing.length; j++) {
    if (!matchedExistingIdx.has(j)) {
      unmatchedExisting.push({
        transaction: existing[j],
        source: 'existing',
        suggestion: 'review',
      });
    }
  }

  // Sort matches by confidence descending
  matched.sort((a, b) => b.confidence - a.confidence);

  const summary: ReconciliationSummary = {
    totalImported: imported.length,
    totalExisting: existing.length,
    exactMatches: matched.filter((m) => m.tier === 'exact').length,
    fuzzyMatches: matched.filter((m) => m.tier !== 'exact').length,
    unmatchedImportedCount: unmatchedImported.length,
    unmatchedExistingCount: unmatchedExisting.length,
    duplicateCount: duplicates.length,
  };

  return {
    matched,
    unmatchedImported,
    unmatchedExisting,
    duplicates,
    summary,
  };
}

/**
 * Compute a match confidence score between two individual transactions.
 *
 * Useful for UI previews where you want to show match quality for a
 * specific pair without running full reconciliation.
 *
 * @param imported - The imported transaction.
 * @param existing - The existing transaction to compare against.
 * @param dateTolerance - Maximum date difference in days. @default 3
 * @returns Confidence score from 0 to 100.
 */
export function computeMatchConfidence(
  imported: ParsedTransaction,
  existing: ExistingTransaction,
  dateTolerance: number = 3,
): number {
  let confidence = 0;

  // Source ID match is definitive
  if (imported.sourceId && existing.sourceId && imported.sourceId === existing.sourceId) {
    return 100;
  }

  // Amount match
  if (imported.amountCents === existing.amountCents) {
    confidence += 40;
  } else {
    return 0; // Amount mismatch is a dealbreaker
  }

  // Date match
  const dateDiff = daysBetween(imported.date, existing.date);
  if (dateDiff === 0) {
    confidence += 30;
  } else if (dateDiff <= dateTolerance) {
    confidence += Math.round(((dateTolerance - dateDiff) / dateTolerance) * 30);
  } else {
    return confidence; // Too far apart — cap at amount-only score
  }

  // Description similarity
  const descScore = stringSimilarity(imported.description, existing.description);
  confidence += Math.round(descScore * 0.3);

  return Math.min(100, confidence);
}
