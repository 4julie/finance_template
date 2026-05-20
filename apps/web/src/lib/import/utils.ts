// SPDX-License-Identifier: BUSL-1.1

/**
 * Shared utility functions for the import library.
 *
 * Includes Banker's rounding (round half to even) for financial calculations.
 * Pure functions — no side effects.
 */

// ---------------------------------------------------------------------------
// Banker's Rounding (IEEE 754 Round Half to Even)
// ---------------------------------------------------------------------------

/**
 * Round a number to the nearest integer using Banker's rounding (HALF_EVEN).
 *
 * When the value is exactly halfway between two integers, it rounds to the
 * nearest even integer. This reduces cumulative rounding bias in financial
 * calculations.
 *
 * @param value - The number to round.
 * @returns The rounded integer.
 *
 * @example
 * bankersRound(2.5)  // → 2  (rounds to even)
 * bankersRound(3.5)  // → 4  (rounds to even)
 * bankersRound(2.51) // → 3  (rounds up normally)
 * bankersRound(2.49) // → 2  (rounds down normally)
 */
export function bankersRound(value: number): number {
  const floored = Math.floor(value);
  const decimal = value - floored;

  // Not at the halfway point — use normal rounding
  if (Math.abs(decimal - 0.5) > 1e-9) {
    return Math.round(value);
  }

  // Exactly halfway — round to even
  return floored % 2 === 0 ? floored : floored + 1;
}

// ---------------------------------------------------------------------------
// String similarity (for fuzzy matching)
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein distance between two strings.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns The edit distance (number of insertions, deletions, substitutions).
 */
export function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;

  // Use a single-row DP approach for O(min(m,n)) space
  let prevRow = Array.from({ length: bLen + 1 }, (_, i) => i);

  for (let i = 1; i <= aLen; i++) {
    const currRow = [i];
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost, // substitution
      );
    }
    prevRow = currRow;
  }

  return prevRow[bLen];
}

/**
 * Compute a similarity score (0–100) between two strings.
 *
 * Uses normalized Levenshtein distance. A score of 100 means identical,
 * 0 means completely different.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns Similarity score from 0 to 100.
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 100;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return Math.round((1 - distance / maxLen) * 100);
}

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

/**
 * Compute the number of calendar days between two ISO date strings.
 *
 * @param dateA - ISO 8601 date string (YYYY-MM-DD).
 * @param dateB - ISO 8601 date string (YYYY-MM-DD).
 * @returns Absolute number of days between the two dates.
 */
export function daysBetween(dateA: string, dateB: string): number {
  const msPerDay = 86_400_000;
  const a = new Date(dateA + 'T00:00:00Z');
  const b = new Date(dateB + 'T00:00:00Z');
  return Math.abs(Math.round((a.getTime() - b.getTime()) / msPerDay));
}
