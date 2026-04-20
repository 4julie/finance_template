// SPDX-License-Identifier: BUSL-1.1

/**
 * CDN and static file cache policy definitions for the Finance PWA.
 *
 * These policies mirror the Caddy configuration in `deploy/Caddyfile` and are
 * consumed by:
 *   - The service worker (`sw/service-worker.ts`) for runtime cache strategy
 *   - The Vite build for asset output naming conventions
 *   - Validation tests to ensure Caddy and app-side caching stay in sync
 *
 * References: issue #897
 * @module lib/cdn/cache-policy
 */

// ---------------------------------------------------------------------------
// Cache duration constants (in seconds)
// ---------------------------------------------------------------------------

/** One year in seconds — used for content-hashed immutable assets. */
export const CACHE_MAX_AGE_IMMUTABLE = 31_536_000;

/** One day in seconds — used for non-hashed static files (icons, fonts). */
export const CACHE_MAX_AGE_STATIC = 86_400;

/** One hour in seconds — used for the PWA manifest. */
export const CACHE_MAX_AGE_MANIFEST = 3_600;

/** Zero — service worker and HTML must always revalidate. */
export const CACHE_MAX_AGE_NO_CACHE = 0;

// ---------------------------------------------------------------------------
// Cache-Control header values
// ---------------------------------------------------------------------------

/** Cache-Control for Vite hashed assets under `/assets/*`. */
export const CACHE_CONTROL_IMMUTABLE = `public, max-age=${CACHE_MAX_AGE_IMMUTABLE}, immutable`;

/** Cache-Control for non-hashed static files (icons, robots.txt, etc.). */
export const CACHE_CONTROL_STATIC = `public, max-age=${CACHE_MAX_AGE_STATIC}, must-revalidate`;

/** Cache-Control for the PWA manifest.json. */
export const CACHE_CONTROL_MANIFEST = `public, max-age=${CACHE_MAX_AGE_MANIFEST}, must-revalidate`;

/** Cache-Control for the service worker — must never be cached. */
export const CACHE_CONTROL_SERVICE_WORKER = 'no-cache, no-store, must-revalidate';

/** Cache-Control for the SPA HTML shell — revalidate on every navigation. */
export const CACHE_CONTROL_HTML = 'no-cache, must-revalidate';

// ---------------------------------------------------------------------------
// Asset classification helpers
// ---------------------------------------------------------------------------

/** File extensions considered immutable when served under `/assets/`. */
const HASHED_ASSET_EXTENSIONS = new Set(['.js', '.css', '.wasm', '.map']);

/** File extensions for static resources that are NOT content-hashed. */
const STATIC_FILE_EXTENSIONS = new Set([
  '.ico',
  '.png',
  '.svg',
  '.webp',
  '.woff2',
  '.woff',
  '.ttf',
  '.xml',
  '.txt',
]);

/**
 * Classify a request path into a cache policy category.
 *
 * @param path - The URL pathname (e.g. `/assets/main-a1b2c3.js`).
 * @returns A cache policy identifier used to select the correct Cache-Control
 *   header and service-worker caching strategy.
 */
export type CacheCategory = 'immutable' | 'static' | 'manifest' | 'service-worker' | 'html' | 'api';

export function classifyCachePolicy(path: string): CacheCategory {
  // Service worker must always revalidate
  if (path === '/sw.js') {
    return 'service-worker';
  }

  // PWA manifest
  if (path === '/manifest.json') {
    return 'manifest';
  }

  // API routes are not cached at the CDN layer
  if (path.startsWith('/rest/') || path.startsWith('/auth/') || path.startsWith('/functions/')) {
    return 'api';
  }

  // Hashed assets under /assets/
  if (path.startsWith('/assets/')) {
    const ext = getExtension(path);
    if (HASHED_ASSET_EXTENSIONS.has(ext)) {
      return 'immutable';
    }
    // Images/fonts in /assets/ are also immutable (Vite hashes them)
    return 'immutable';
  }

  // Non-hashed static files
  const ext = getExtension(path);
  if (STATIC_FILE_EXTENSIONS.has(ext)) {
    return 'static';
  }

  // Everything else falls through to the SPA shell
  return 'html';
}

/**
 * Return the appropriate Cache-Control header value for a given path.
 *
 * @param path - The URL pathname.
 * @returns The Cache-Control header string, or `null` for API routes (which
 *   are handled by the upstream service).
 */
export function getCacheControlHeader(path: string): string | null {
  const category = classifyCachePolicy(path);
  switch (category) {
    case 'immutable':
      return CACHE_CONTROL_IMMUTABLE;
    case 'static':
      return CACHE_CONTROL_STATIC;
    case 'manifest':
      return CACHE_CONTROL_MANIFEST;
    case 'service-worker':
      return CACHE_CONTROL_SERVICE_WORKER;
    case 'html':
      return CACHE_CONTROL_HTML;
    case 'api':
      return null;
  }
}

// ---------------------------------------------------------------------------
// Security header definitions
// ---------------------------------------------------------------------------

/**
 * Security headers that Caddy applies to all responses.
 * Exported so the service worker and tests can validate consistency.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the file extension from a URL path (lowercased, including the dot). */
function getExtension(path: string): string {
  // Strip query string and fragment
  const cleaned = path.split('?')[0].split('#')[0];
  const lastDot = cleaned.lastIndexOf('.');
  if (lastDot === -1 || lastDot === cleaned.length - 1) {
    return '';
  }
  return cleaned.slice(lastDot).toLowerCase();
}
