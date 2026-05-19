// SPDX-License-Identifier: BUSL-1.1

/**
 * Pattern-based merchant matching engine.
 *
 * Tests a transaction description against all known merchant regex patterns
 * and returns the best match. Includes description normalization to strip
 * noise commonly found in bank statement strings.
 *
 * @module lib/merchants/merchant-matcher
 * References: issue #1514
 */

import type { KnownMerchant, MerchantMatchResult } from './merchant-types';

// ---------------------------------------------------------------------------
// Description normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a raw bank description by stripping trailing noise.
 *
 * Removes:
 * - Trailing numeric sequences (store IDs, reference numbers)
 * - Location suffixes (city/state patterns like "NEW YORK NY")
 * - Extra whitespace
 * - Common prefixes like "POS", "DEBIT", "PURCHASE"
 *
 * @param raw - The raw description from a bank import.
 * @returns A cleaned string suitable for pattern matching.
 */
export function normalizeDescription(raw: string): string {
  let cleaned = raw.trim().toUpperCase();

  // Strip common transaction prefixes
  cleaned = cleaned.replace(/^(POS\s+|DEBIT\s+|PURCHASE\s+|SQ\s*\*\s*|TST\s*\*\s*)/, '');

  // Strip trailing reference/store numbers (e.g. "#12345", "  00012345")
  cleaned = cleaned.replace(/\s*#?\d{4,}$/, '');

  // Strip trailing city/state patterns (e.g. "NEW YORK NY", "SAN FRANCISCO CA 94103")
  cleaned = cleaned.replace(/\s+[A-Z]{2,}\s+[A-Z]{2}\s*\d{0,5}$/, '');

  // Strip trailing date-like patterns (e.g. "01/15")
  cleaned = cleaned.replace(/\s+\d{2}\/\d{2}$/, '');

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Test a description against a single merchant's patterns.
 *
 * @returns The first matching pattern string, or `null` if none match.
 */
function testPatterns(description: string, merchant: KnownMerchant): string | null {
  for (const pattern of merchant.patterns) {
    try {
      const regex = new RegExp(`^${pattern}$`, 'i');
      if (regex.test(description)) {
        return pattern;
      }
    } catch {
      // Invalid regex — skip this pattern silently.
    }
  }
  return null;
}

/**
 * Compute a confidence score for a match.
 *
 * Higher scores for:
 * - Exact (short) patterns vs. broad wildcards
 * - Higher historical match counts (popular merchants)
 */
function computeConfidence(description: string, pattern: string, merchant: KnownMerchant): number {
  // Base confidence from pattern specificity (shorter pattern = more specific)
  const patternLength = pattern.replace(/[.*+?^${}()|[\]\\]/g, '').length;
  const specificity = Math.min(patternLength / Math.max(description.length, 1), 1);

  // Boost from historical match frequency (logarithmic scale)
  const frequencyBoost = Math.min(Math.log2(merchant.matchCount + 1) / 10, 0.2);

  return Math.min(0.5 + specificity * 0.3 + frequencyBoost, 1);
}

/**
 * Match a transaction description against all known merchants.
 *
 * Tests both the raw and normalized description against every merchant's
 * patterns. Returns the best match (highest confidence), or `null` if
 * no patterns match.
 *
 * @param description - Raw transaction description/payee string.
 * @param merchants - The list of known merchants to test against.
 * @returns The best match result, or `null` if no match found.
 */
export function matchMerchant(
  description: string,
  merchants: readonly KnownMerchant[],
): MerchantMatchResult | null {
  if (!description.trim()) {
    return null;
  }

  const normalized = normalizeDescription(description);
  let bestMatch: MerchantMatchResult | null = null;

  for (const merchant of merchants) {
    // Try both raw (uppercased) and normalized
    const rawMatch = testPatterns(description.toUpperCase(), merchant);
    const normalizedMatch = rawMatch === null ? testPatterns(normalized, merchant) : null;
    const matchedPattern = rawMatch ?? normalizedMatch;

    if (matchedPattern !== null) {
      const confidence = computeConfidence(normalized, matchedPattern, merchant);

      if (bestMatch === null || confidence > bestMatch.confidence) {
        bestMatch = { merchant, matchedPattern, confidence };
      } else if (
        confidence === bestMatch.confidence &&
        merchant.matchCount > bestMatch.merchant.matchCount
      ) {
        // Tie-break: prefer higher match count
        bestMatch = { merchant, matchedPattern, confidence };
      }
    }
  }

  return bestMatch;
}
