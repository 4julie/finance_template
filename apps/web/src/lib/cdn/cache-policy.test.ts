// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import {
  CACHE_CONTROL_HTML,
  CACHE_CONTROL_IMMUTABLE,
  CACHE_CONTROL_MANIFEST,
  CACHE_CONTROL_SERVICE_WORKER,
  CACHE_CONTROL_STATIC,
  CACHE_MAX_AGE_IMMUTABLE,
  CACHE_MAX_AGE_MANIFEST,
  CACHE_MAX_AGE_NO_CACHE,
  CACHE_MAX_AGE_STATIC,
  classifyCachePolicy,
  getCacheControlHeader,
  SECURITY_HEADERS,
} from './cache-policy';

// ---------------------------------------------------------------------------
// Cache duration constants
// ---------------------------------------------------------------------------

describe('Cache duration constants', () => {
  it('defines immutable cache as 1 year (31536000s)', () => {
    expect(CACHE_MAX_AGE_IMMUTABLE).toBe(31_536_000);
  });

  it('defines static cache as 1 day (86400s)', () => {
    expect(CACHE_MAX_AGE_STATIC).toBe(86_400);
  });

  it('defines manifest cache as 1 hour (3600s)', () => {
    expect(CACHE_MAX_AGE_MANIFEST).toBe(3_600);
  });

  it('defines no-cache age as 0', () => {
    expect(CACHE_MAX_AGE_NO_CACHE).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cache-Control header values
// ---------------------------------------------------------------------------

describe('Cache-Control header constants', () => {
  it('immutable assets include "immutable" directive', () => {
    expect(CACHE_CONTROL_IMMUTABLE).toContain('immutable');
    expect(CACHE_CONTROL_IMMUTABLE).toContain('public');
    expect(CACHE_CONTROL_IMMUTABLE).toContain('max-age=31536000');
  });

  it('static assets require revalidation', () => {
    expect(CACHE_CONTROL_STATIC).toContain('must-revalidate');
    expect(CACHE_CONTROL_STATIC).toContain('public');
  });

  it('manifest has short cache with revalidation', () => {
    expect(CACHE_CONTROL_MANIFEST).toContain('max-age=3600');
    expect(CACHE_CONTROL_MANIFEST).toContain('must-revalidate');
  });

  it('service worker must never be cached', () => {
    expect(CACHE_CONTROL_SERVICE_WORKER).toContain('no-cache');
    expect(CACHE_CONTROL_SERVICE_WORKER).toContain('no-store');
    expect(CACHE_CONTROL_SERVICE_WORKER).toContain('must-revalidate');
  });

  it('HTML shell must revalidate on every request', () => {
    expect(CACHE_CONTROL_HTML).toContain('no-cache');
    expect(CACHE_CONTROL_HTML).toContain('must-revalidate');
  });
});

// ---------------------------------------------------------------------------
// classifyCachePolicy
// ---------------------------------------------------------------------------

describe('classifyCachePolicy', () => {
  it('classifies /sw.js as service-worker', () => {
    expect(classifyCachePolicy('/sw.js')).toBe('service-worker');
  });

  it('classifies /manifest.json as manifest', () => {
    expect(classifyCachePolicy('/manifest.json')).toBe('manifest');
  });

  it('classifies /assets/*.js as immutable', () => {
    expect(classifyCachePolicy('/assets/main-a1b2c3d4.js')).toBe('immutable');
  });

  it('classifies /assets/*.css as immutable', () => {
    expect(classifyCachePolicy('/assets/styles-abc123.css')).toBe('immutable');
  });

  it('classifies /assets/*.wasm as immutable', () => {
    expect(classifyCachePolicy('/assets/sqlite-xyz.wasm')).toBe('immutable');
  });

  it('classifies /assets/image.png as immutable (hashed by Vite)', () => {
    expect(classifyCachePolicy('/assets/logo-hash123.png')).toBe('immutable');
  });

  it('classifies root-level .ico as static', () => {
    expect(classifyCachePolicy('/favicon.ico')).toBe('static');
  });

  it('classifies root-level .png as static', () => {
    expect(classifyCachePolicy('/icon-192.png')).toBe('static');
  });

  it('classifies robots.txt as static', () => {
    expect(classifyCachePolicy('/robots.txt')).toBe('static');
  });

  it('classifies .woff2 font files as static', () => {
    expect(classifyCachePolicy('/fonts/inter.woff2')).toBe('static');
  });

  it('classifies /rest/* as api', () => {
    expect(classifyCachePolicy('/rest/accounts')).toBe('api');
  });

  it('classifies /auth/* as api', () => {
    expect(classifyCachePolicy('/auth/v1/token')).toBe('api');
  });

  it('classifies /functions/* as api', () => {
    expect(classifyCachePolicy('/functions/sync')).toBe('api');
  });

  it('classifies / as html', () => {
    expect(classifyCachePolicy('/')).toBe('html');
  });

  it('classifies /dashboard as html', () => {
    expect(classifyCachePolicy('/dashboard')).toBe('html');
  });

  it('classifies /accounts/123 as html (SPA route)', () => {
    expect(classifyCachePolicy('/accounts/123')).toBe('html');
  });

  it('strips query strings before classification', () => {
    expect(classifyCachePolicy('/assets/main-abc.js?v=1')).toBe('immutable');
  });

  it('strips fragments before classification', () => {
    expect(classifyCachePolicy('/robots.txt#section')).toBe('static');
  });
});

// ---------------------------------------------------------------------------
// getCacheControlHeader
// ---------------------------------------------------------------------------

describe('getCacheControlHeader', () => {
  it('returns immutable header for hashed assets', () => {
    expect(getCacheControlHeader('/assets/chunk-abc123.js')).toBe(CACHE_CONTROL_IMMUTABLE);
  });

  it('returns static header for favicon', () => {
    expect(getCacheControlHeader('/favicon.ico')).toBe(CACHE_CONTROL_STATIC);
  });

  it('returns manifest header for /manifest.json', () => {
    expect(getCacheControlHeader('/manifest.json')).toBe(CACHE_CONTROL_MANIFEST);
  });

  it('returns service-worker header for /sw.js', () => {
    expect(getCacheControlHeader('/sw.js')).toBe(CACHE_CONTROL_SERVICE_WORKER);
  });

  it('returns HTML header for SPA routes', () => {
    expect(getCacheControlHeader('/dashboard')).toBe(CACHE_CONTROL_HTML);
    expect(getCacheControlHeader('/transactions/new')).toBe(CACHE_CONTROL_HTML);
  });

  it('returns null for API routes (upstream handles caching)', () => {
    expect(getCacheControlHeader('/rest/accounts')).toBeNull();
    expect(getCacheControlHeader('/auth/v1/token')).toBeNull();
    expect(getCacheControlHeader('/functions/sync')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Security headers
// ---------------------------------------------------------------------------

describe('SECURITY_HEADERS', () => {
  it('includes HSTS with preload', () => {
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('preload');
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  it('includes X-Content-Type-Options: nosniff', () => {
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('includes X-Frame-Options: DENY', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
  });

  it('includes Referrer-Policy', () => {
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });
});
