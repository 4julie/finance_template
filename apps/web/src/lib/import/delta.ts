// SPDX-License-Identifier: BUSL-1.1

/**
 * Delta detection between imported and existing transactions.
 *
 * Classifies transactions as new, modified, deleted, or unchanged
 * by comparing imported data against the current local state.
 *
 * Pure functions — no side effects, no database access.
 */

import { ParsedTransaction } from './types';
import { ExistingTransaction } from './reconciliation';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Classification of a transaction's delta status. */
export type DeltaStatus = 'new' | 'modified' | 'deleted' | 'unchanged';

/** A single delta entry describing the change for one transaction. */
export interface DeltaEntry {
  /** Delta classification. */
  readonly status: DeltaStatus;
  /** The imported transaction (null for 'deleted' entries). */
  readonly imported: ParsedTransaction | null;
  /** The existing transaction (null for 'new' entries). */
  readonly existing: ExistingTransaction | null;
  /** List of field names that changed (only for 'modified' entries). */
  readonly changedFields: readonly string[];
}

/** Complete delta report comparing two transaction sets. */
export interface DeltaReport {
  /** All delta entries. */
  readonly entries: readonly DeltaEntry[];
  /** Transactions present in import but not in existing data. */
  readonly newTransactions: readonly DeltaEntry[];
  /** Transactions present in both but with different values. */
  readonly modifiedTransactions: readonly DeltaEntry[];
  /** Transactions in existing data but absent from import. */
  readonly deletedTransactions: readonly DeltaEntry[];
  /** Transactions that are identical in both sets. */
  readonly unchangedTransactions: readonly DeltaEntry[];
  /** Summary counts. */
  readonly summary: DeltaSummary;
}

/** Summary statistics for a delta report. */
export interface DeltaSummary {
  readonly total: number;
  readonly newCount: number;
  readonly modifiedCount: number;
  readonly deletedCount: number;
  readonly unchangedCount: number;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the delta between imported and existing transactions.
 *
 * Matches transactions by `sourceId` when available, then by
 * exact `(date, amountCents)` pairs. Unmatched imported transactions
 * are classified as "new"; unmatched existing as "deleted".
 *
 * @param imported - Transactions parsed from an import file.
 * @param existing - Transactions currently in the local database.
 * @returns A complete delta report.
 */
export function computeDelta(
  imported: readonly ParsedTransaction[],
  existing: readonly ExistingTransaction[],
): DeltaReport {
  const entries: DeltaEntry[] = [];
  const matchedImportedIdx = new Set<number>();
  const matchedExistingIdx = new Set<number>();

  // Pass 1: Match by sourceId
  for (let i = 0; i < imported.length; i++) {
    const imp = imported[i];
    if (!imp.sourceId) continue;

    for (let j = 0; j < existing.length; j++) {
      if (matchedExistingIdx.has(j)) continue;
      const ext = existing[j];
      if (ext.sourceId === imp.sourceId) {
        const changedFields = detectChangedFields(imp, ext);
        entries.push({
          status: changedFields.length > 0 ? 'modified' : 'unchanged',
          imported: imp,
          existing: ext,
          changedFields,
        });
        matchedImportedIdx.add(i);
        matchedExistingIdx.add(j);
        break;
      }
    }
  }

  // Pass 2: Match by (date, amountCents)
  for (let i = 0; i < imported.length; i++) {
    if (matchedImportedIdx.has(i)) continue;
    const imp = imported[i];

    for (let j = 0; j < existing.length; j++) {
      if (matchedExistingIdx.has(j)) continue;
      const ext = existing[j];

      if (imp.date === ext.date && imp.amountCents === ext.amountCents) {
        const changedFields = detectChangedFields(imp, ext);
        entries.push({
          status: changedFields.length > 0 ? 'modified' : 'unchanged',
          imported: imp,
          existing: ext,
          changedFields,
        });
        matchedImportedIdx.add(i);
        matchedExistingIdx.add(j);
        break;
      }
    }
  }

  // Unmatched imported → new
  for (let i = 0; i < imported.length; i++) {
    if (!matchedImportedIdx.has(i)) {
      entries.push({
        status: 'new',
        imported: imported[i],
        existing: null,
        changedFields: [],
      });
    }
  }

  // Unmatched existing → deleted
  for (let j = 0; j < existing.length; j++) {
    if (!matchedExistingIdx.has(j)) {
      entries.push({
        status: 'deleted',
        imported: null,
        existing: existing[j],
        changedFields: [],
      });
    }
  }

  const newTxns = entries.filter((e) => e.status === 'new');
  const modifiedTxns = entries.filter((e) => e.status === 'modified');
  const deletedTxns = entries.filter((e) => e.status === 'deleted');
  const unchangedTxns = entries.filter((e) => e.status === 'unchanged');

  return {
    entries,
    newTransactions: newTxns,
    modifiedTransactions: modifiedTxns,
    deletedTransactions: deletedTxns,
    unchangedTransactions: unchangedTxns,
    summary: {
      total: entries.length,
      newCount: newTxns.length,
      modifiedCount: modifiedTxns.length,
      deletedCount: deletedTxns.length,
      unchangedCount: unchangedTxns.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Detect which fields differ between an imported and existing transaction.
 *
 * @param imported - The imported transaction.
 * @param existing - The existing transaction.
 * @returns Array of field names that differ.
 */
function detectChangedFields(imported: ParsedTransaction, existing: ExistingTransaction): string[] {
  const changed: string[] = [];

  if (imported.date !== existing.date) {
    changed.push('date');
  }

  if (imported.amountCents !== existing.amountCents) {
    changed.push('amountCents');
  }

  // Normalize descriptions for comparison (trim + lowercase)
  const impDesc = imported.description.trim().toLowerCase();
  const extDesc = existing.description.trim().toLowerCase();
  if (impDesc !== extDesc) {
    changed.push('description');
  }

  return changed;
}
