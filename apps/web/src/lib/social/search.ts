// SPDX-License-Identifier: BUSL-1.1

/**
 * Note search engine with keyword matching, tag filtering,
 * date range filtering, and relevance ranking.
 *
 * Pure functions operating on in-memory note arrays. No database.
 *
 * References: #1626
 */

import type { NoteSearchFilters, NoteSearchResult, TransactionNote } from './types';

// ---------------------------------------------------------------------------
// Search Implementation
// ---------------------------------------------------------------------------

/**
 * Computes a relevance score for a note matching a keyword.
 *
 * Scoring heuristics:
 * - Exact case-insensitive match in text: 100
 * - Partial match: 60 + (keyword.length / text.length) * 40
 * - Multiple occurrences boost score
 *
 * @param note - The note to score.
 * @param keyword - Search keyword (case-insensitive).
 * @returns Relevance score (0–100), or 0 if no match.
 */
export function computeKeywordRelevance(note: TransactionNote, keyword: string): number {
  if (!keyword) return 50; // No keyword = neutral relevance

  const lowerText = note.text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  if (!lowerText.includes(lowerKeyword)) return 0;

  // Count occurrences
  let count = 0;
  let pos = 0;
  while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
    count++;
    pos += lowerKeyword.length;
  }

  // Base score from match quality
  const exactMatch = lowerText === lowerKeyword;
  const baseScore = exactMatch ? 100 : 60 + (lowerKeyword.length / lowerText.length) * 40;

  // Occurrence bonus (diminishing returns)
  const occurrenceBonus = Math.min(20, (count - 1) * 5);

  return Math.min(100, Math.round(baseScore + occurrenceBonus));
}

/**
 * Checks whether a note matches the given tag filters.
 *
 * All specified tags must be present on the note (AND logic).
 *
 * @param note - The note to check.
 * @param tags - Required tags.
 * @returns True if all tags are present.
 */
export function matchesTags(note: TransactionNote, tags: readonly string[]): boolean {
  if (tags.length === 0) return true;

  const noteTagSet = new Set(note.tags.map((t) => t.toLowerCase()));
  return tags.every((tag) => noteTagSet.has(tag.toLowerCase()));
}

/**
 * Checks whether a note falls within a date range.
 *
 * @param note - The note to check.
 * @param dateFrom - Inclusive start date (ISO-8601), or undefined for no lower bound.
 * @param dateTo - Inclusive end date (ISO-8601), or undefined for no upper bound.
 * @returns True if the note's creation date is within range.
 */
export function matchesDateRange(
  note: TransactionNote,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  if (dateFrom && note.createdAt < dateFrom) return false;
  if (dateTo && note.createdAt > dateTo) return false;
  return true;
}

/**
 * Searches notes with keyword, tag, and date range filters.
 *
 * Results are ranked by relevance score (highest first).
 *
 * @param notes - Array of notes to search.
 * @param filters - Search filter criteria.
 * @returns Sorted array of NoteSearchResults (highest relevance first).
 */
export function searchNotes(
  notes: readonly TransactionNote[],
  filters: NoteSearchFilters,
): NoteSearchResult[] {
  const results: NoteSearchResult[] = [];

  for (const note of notes) {
    // Tag filter
    if (filters.tags && !matchesTags(note, filters.tags)) continue;

    // Date range filter
    if (!matchesDateRange(note, filters.dateFrom, filters.dateTo)) continue;

    // Keyword relevance
    const relevanceScore = computeKeywordRelevance(note, filters.keyword ?? '');

    // If keyword was specified and didn't match, skip
    if (filters.keyword && relevanceScore === 0) continue;

    results.push({ note, relevanceScore });
  }

  // Sort by relevance descending, then by creation date descending
  return results.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.note.createdAt.localeCompare(a.note.createdAt);
  });
}
