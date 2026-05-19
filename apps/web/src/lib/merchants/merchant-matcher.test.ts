// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for merchant pattern matching and description normalization.
 *
 * References: issue #1514
 */

import { describe, expect, it } from 'vitest';

import { matchMerchant, normalizeDescription } from './merchant-matcher';
import type { KnownMerchant } from './merchant-types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TEST_MERCHANTS: KnownMerchant[] = [
  {
    id: 'walgreens-id',
    name: 'Walgreens',
    categoryDefault: 'Health & Pharmacy',
    patterns: ['WALGREENS.*', 'WAL\\s*GREENS.*', 'WALGR.*'],
    matchCount: 10,
  },
  {
    id: 'amazon-id',
    name: 'Amazon',
    categoryDefault: 'Shopping',
    patterns: ['^AMAZON\\.COM.*$', 'AMZN\\s*MKTP.*', 'AMAZON\\s*(PRIME|DIGITAL|MARKETPLACE)?.*'],
    matchCount: 25,
  },
  {
    id: 'starbucks-id',
    name: 'Starbucks',
    categoryDefault: 'Coffee & Cafes',
    patterns: ['STARBUCKS.*', 'SBUX.*'],
    matchCount: 5,
  },
  {
    id: 'uber-id',
    name: 'Uber',
    categoryDefault: 'Transportation',
    patterns: ['UBER\\s*(TRIP|EATS)?.*', '^UBER\\.COM.*$'],
    matchCount: 3,
  },
];

// ---------------------------------------------------------------------------
// normalizeDescription
// ---------------------------------------------------------------------------

describe('normalizeDescription', () => {
  it('strips trailing store/reference numbers', () => {
    expect(normalizeDescription('WALGREENS 12345')).toBe('WALGREENS');
  });

  it('strips common POS/DEBIT prefixes', () => {
    expect(normalizeDescription('POS STARBUCKS 5678')).toBe('STARBUCKS');
    expect(normalizeDescription('DEBIT WALGREENS')).toBe('WALGREENS');
  });

  it('strips SQ* and TST* prefixes', () => {
    expect(normalizeDescription('SQ *COFFEE SHOP 9876')).toBe('COFFEE SHOP');
    expect(normalizeDescription('TST* PIZZA PLACE')).toBe('PIZZA PLACE');
  });

  it('strips trailing city/state', () => {
    expect(normalizeDescription('WALGREENS PHOENIX AZ')).toBe('WALGREENS');
  });

  it('strips trailing date patterns', () => {
    expect(normalizeDescription('AMAZON MARKETPLACE 01/15')).toBe('AMAZON MARKETPLACE');
  });

  it('collapses whitespace', () => {
    expect(normalizeDescription('  WAL   GREENS   ')).toBe('WAL GREENS');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeDescription('')).toBe('');
    expect(normalizeDescription('   ')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// matchMerchant
// ---------------------------------------------------------------------------

describe('matchMerchant', () => {
  it('returns null for empty description', () => {
    expect(matchMerchant('', TEST_MERCHANTS)).toBeNull();
    expect(matchMerchant('   ', TEST_MERCHANTS)).toBeNull();
  });

  it('returns null when no patterns match', () => {
    expect(matchMerchant('RANDOM UNKNOWN STORE', TEST_MERCHANTS)).toBeNull();
  });

  it('matches exact merchant name', () => {
    const result = matchMerchant('WALGREENS', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Walgreens');
  });

  it('matches with trailing store number (via normalization)', () => {
    const result = matchMerchant('WALGREENS 12345', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Walgreens');
  });

  it('matches Amazon with AMZN variation', () => {
    const result = matchMerchant('AMZN MKTP US', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Amazon');
  });

  it('matches Starbucks with SBUX variation', () => {
    const result = matchMerchant('SBUX 00123', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Starbucks');
  });

  it('matches Uber with subtypes', () => {
    const result = matchMerchant('UBER EATS', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Uber');
  });

  it('is case-insensitive', () => {
    const result = matchMerchant('walgreens', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Walgreens');
  });

  it('returns confidence between 0 and 1', () => {
    const result = matchMerchant('WALGREENS', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThan(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
  });

  it('returns empty merchant list without error', () => {
    expect(matchMerchant('WALGREENS', [])).toBeNull();
  });

  it('handles POS-prefixed descriptions', () => {
    const result = matchMerchant('POS STARBUCKS STORE 456', TEST_MERCHANTS);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('Starbucks');
  });

  it('prefers higher match count on tie', () => {
    const tiedMerchants: KnownMerchant[] = [
      {
        id: 'a',
        name: 'MerchantA',
        patterns: ['TEST.*'],
        matchCount: 5,
      },
      {
        id: 'b',
        name: 'MerchantB',
        patterns: ['TEST.*'],
        matchCount: 15,
      },
    ];

    const result = matchMerchant('TEST TRANSACTION', tiedMerchants);
    expect(result).not.toBeNull();
    expect(result!.merchant.name).toBe('MerchantB');
  });
});
