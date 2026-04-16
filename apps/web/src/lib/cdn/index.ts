// SPDX-License-Identifier: BUSL-1.1

/**
 * Barrel export for CDN/caching utilities.
 *
 * @module lib/cdn
 */

export {
  CACHE_MAX_AGE_IMMUTABLE,
  CACHE_MAX_AGE_STATIC,
  CACHE_MAX_AGE_MANIFEST,
  CACHE_MAX_AGE_NO_CACHE,
  CACHE_CONTROL_IMMUTABLE,
  CACHE_CONTROL_STATIC,
  CACHE_CONTROL_MANIFEST,
  CACHE_CONTROL_SERVICE_WORKER,
  CACHE_CONTROL_HTML,
  SECURITY_HEADERS,
  classifyCachePolicy,
  getCacheControlHeader,
} from './cache-policy';

export type { CacheCategory } from './cache-policy';

export { parseCaddyDirectives, hasCompression, hasSecurityHeader } from './caddy-config-validator';

export type { CaddyDirective } from './caddy-config-validator';
