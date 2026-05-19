// SPDX-License-Identifier: BUSL-1.1

/**
 * Seed data for common US merchants.
 *
 * Each merchant includes 2–3 regex patterns covering common variations
 * found in bank statement descriptions. Patterns are case-insensitive.
 *
 * @module lib/merchants/merchant-seed
 * References: issue #1514
 */

import type { CreateMerchantInput } from './merchant-types';

/** Default set of ~20 common US merchants with pattern variations. */
export const SEED_MERCHANTS: readonly CreateMerchantInput[] = [
  {
    name: 'Walgreens',
    categoryDefault: 'Health & Pharmacy',
    patterns: ['WALGREENS.*', 'WAL\\s*GREENS.*', 'WALGR.*'],
  },
  {
    name: 'CVS',
    categoryDefault: 'Health & Pharmacy',
    patterns: ['CVS\\s*(PHARMACY)?.*', 'CVS/PHARMACY.*'],
  },
  {
    name: 'Walmart',
    categoryDefault: 'Shopping',
    patterns: ['WALMART.*', 'WAL-?MART.*', 'WM\\s*SUPERCENTER.*'],
  },
  {
    name: 'Target',
    categoryDefault: 'Shopping',
    patterns: ['TARGET.*', 'TARGET\\s+\\d+.*'],
  },
  {
    name: 'Amazon',
    categoryDefault: 'Shopping',
    patterns: ['AMAZON\\.COM.*', 'AMZN\\s*MKTP.*', 'AMAZON\\s*(PRIME|DIGITAL|MARKETPLACE)?.*'],
  },
  {
    name: 'Costco',
    categoryDefault: 'Shopping',
    patterns: ['COSTCO\\s*(WHSE|WHOLESALE)?.*', 'COSTCO\\.COM.*'],
  },
  {
    name: 'Starbucks',
    categoryDefault: 'Coffee & Cafes',
    patterns: ['STARBUCKS.*', 'SBUX.*'],
  },
  {
    name: "McDonald's",
    categoryDefault: 'Dining',
    patterns: ["MCDONALD'?S.*", 'MCD.*'],
  },
  {
    name: 'Uber',
    categoryDefault: 'Transportation',
    patterns: ['UBER\\s*(TRIP|EATS)?.*', 'UBER\\.COM.*'],
  },
  {
    name: 'Lyft',
    categoryDefault: 'Transportation',
    patterns: ['LYFT.*'],
  },
  {
    name: 'Netflix',
    categoryDefault: 'Entertainment',
    patterns: ['NETFLIX\\.COM.*', 'NETFLIX\\s*INC.*'],
  },
  {
    name: 'Spotify',
    categoryDefault: 'Entertainment',
    patterns: ['SPOTIFY.*'],
  },
  {
    name: 'Apple',
    categoryDefault: 'Technology',
    patterns: ['APPLE\\.COM.*', 'APPLE\\s*(STORE|ITUNES)?.*', 'APL\\*.*'],
  },
  {
    name: 'Google',
    categoryDefault: 'Technology',
    patterns: ['GOOGLE\\s*(PLAY|CLOUD|ONE|STORAGE)?.*', 'GOOGLE\\.COM.*'],
  },
  {
    name: 'Venmo',
    categoryDefault: 'Transfers',
    patterns: ['VENMO.*'],
  },
  {
    name: 'PayPal',
    categoryDefault: 'Transfers',
    patterns: ['PAYPAL.*', 'PP\\*.*'],
  },
  {
    name: 'Chase',
    categoryDefault: 'Banking',
    patterns: ['CHASE\\s*(CREDIT|BANK)?.*'],
  },
  {
    name: 'Wells Fargo',
    categoryDefault: 'Banking',
    patterns: ['WELLS\\s*FARGO.*', 'WF\\s*(BANK|CREDIT)?.*'],
  },
  {
    name: 'Whole Foods',
    categoryDefault: 'Groceries',
    patterns: ['WHOLE\\s*FOODS.*', 'WFM\\s*#?\\d*.*'],
  },
  {
    name: "Trader Joe's",
    categoryDefault: 'Groceries',
    patterns: ["TRADER\\s*JOE'?S.*", 'TJ\\s*#?\\d*.*'],
  },
];
