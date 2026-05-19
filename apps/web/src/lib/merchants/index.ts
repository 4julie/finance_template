// SPDX-License-Identifier: BUSL-1.1

/**
 * Public barrel exports for the merchants module.
 *
 * @module lib/merchants
 * References: issue #1514
 */

export type { KnownMerchant, CreateMerchantInput, MerchantMatchResult } from './merchant-types';
export { matchMerchant, normalizeDescription } from './merchant-matcher';
export {
  getKnownMerchants,
  addKnownMerchant,
  updateMerchantMatchCount,
  updateKnownMerchant,
  deleteMerchant,
} from './merchant-store';
export { SEED_MERCHANTS } from './merchant-seed';
