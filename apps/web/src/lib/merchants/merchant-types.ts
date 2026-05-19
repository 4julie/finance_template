// SPDX-License-Identifier: BUSL-1.1

/**
 * Type definitions for the known merchants system.
 *
 * Known merchants provide pattern-based matching for messy bank import
 * strings, enabling automatic counterparty identification and default
 * category assignment on transaction creation/import.
 *
 * @module lib/merchants/merchant-types
 * References: issue #1514
 */

/** A known merchant with regex patterns for matching transaction descriptions. */
export interface KnownMerchant {
  /** Unique identifier (UUID). */
  readonly id: string;
  /** Canonical display name (e.g. "Walgreens"). */
  readonly name: string;
  /** Optional override for UI display. */
  readonly displayName?: string;
  /** Default category name to auto-fill when matched. */
  readonly categoryDefault?: string;
  /** Regex patterns to match against transaction descriptions. */
  readonly patterns: readonly string[];
  /** Number of times this merchant has been matched (for ranking). */
  readonly matchCount: number;
}

/** Input for creating a new known merchant. */
export interface CreateMerchantInput {
  /** Canonical display name. */
  readonly name: string;
  /** Optional override for UI display. */
  readonly displayName?: string;
  /** Default category name to auto-fill when matched. */
  readonly categoryDefault?: string;
  /** Regex patterns to match against transaction descriptions. */
  readonly patterns: readonly string[];
}

/** Result of a merchant pattern match. */
export interface MerchantMatchResult {
  /** The matched merchant. */
  readonly merchant: KnownMerchant;
  /** The pattern that matched. */
  readonly matchedPattern: string;
  /** Confidence score (0–1) based on match quality. */
  readonly confidence: number;
}
