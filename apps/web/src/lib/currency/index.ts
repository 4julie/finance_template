// SPDX-License-Identifier: BUSL-1.1

/**
 * Public barrel export for the currency conversion infrastructure.
 *
 * References: issue #1515
 */

export type { ExchangeRate, ExchangeRateProvider, ConversionResult } from './exchange-rate-types';

export { StaticRateProvider, STATIC_CURRENCY_CODES } from './static-rates';

export {
  getCachedRate,
  setCachedRate,
  getCachedRates,
  setCachedRates,
  isCacheStale,
  getCacheTimestamp,
  clearRateCache,
  DEFAULT_CACHE_TTL_MS,
} from './rate-cache';

export { ExchangeRateService } from './exchange-rate-service';
