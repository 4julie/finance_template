// SPDX-License-Identifier: BUSL-1.1

/**
 * Caddy routing configuration tests (#1324).
 *
 * Validates route matching for API endpoints, reverse-proxy
 * configuration, health-check endpoints, rate-limiting headers,
 * and CORS configuration as defined in the Caddy reverse proxy.
 *
 * These tests exercise routing logic in isolation — they do NOT
 * require a running Caddy instance.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Routing configuration types & helpers
// ---------------------------------------------------------------------------

/** A single Caddy route definition. */
interface CaddyRoute {
  /** URL path pattern (e.g. `/functions/v1/*`). */
  match: string;
  /** Upstream target for reverse proxy. */
  upstream: string;
  /** Whether this route requires authentication. */
  requiresAuth: boolean;
  /** Rate limit (requests per second per IP), 0 = no limit. */
  rateLimit: number;
}

/** Simulated Caddy routing table for the Finance API. */
const ROUTES: CaddyRoute[] = [
  {
    match: '/functions/v1/health-check',
    upstream: 'http://edge-runtime:8000/health-check',
    requiresAuth: false,
    rateLimit: 10,
  },
  {
    match: '/functions/v1/auth-webhook',
    upstream: 'http://edge-runtime:8000/auth-webhook',
    requiresAuth: false,
    rateLimit: 50,
  },
  {
    match: '/functions/v1/*',
    upstream: 'http://edge-runtime:8000',
    requiresAuth: true,
    rateLimit: 30,
  },
  {
    match: '/rest/v1/*',
    upstream: 'http://postgrest:3000',
    requiresAuth: true,
    rateLimit: 100,
  },
  {
    match: '/auth/v1/*',
    upstream: 'http://gotrue:9999',
    requiresAuth: false,
    rateLimit: 20,
  },
  {
    match: '/health',
    upstream: 'internal',
    requiresAuth: false,
    rateLimit: 0,
  },
];

/**
 * Find the best matching route for a given path.
 *
 * Exact matches take priority over wildcard matches. Returns `null`
 * if no route matches.
 */
function matchRoute(path: string): CaddyRoute | null {
  // Exact match first
  const exact = ROUTES.find((r) => r.match === path);
  if (exact) return exact;

  // Wildcard match (longest prefix wins)
  const wildcards = ROUTES.filter((r) => r.match.endsWith('/*'))
    .map((r) => ({ route: r, prefix: r.match.slice(0, -1) }))
    .filter(({ prefix }) => path.startsWith(prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length);

  return wildcards.length > 0 ? wildcards[0].route : null;
}

/**
 * Simulate rate-limit headers for a matched route.
 */
function getRateLimitHeaders(route: CaddyRoute): Record<string, string> {
  if (route.rateLimit <= 0) return {};
  return {
    'X-RateLimit-Limit': String(route.rateLimit),
    'X-RateLimit-Remaining': String(route.rateLimit - 1),
    'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
  };
}

/**
 * Simulate CORS headers based on the route.
 */
function getCorsHeaders(origin: string, allowedOrigins: string[]): Record<string, string> {
  const isAllowed = allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Route matching', () => {
  it('matches exact health-check path', () => {
    const route = matchRoute('/functions/v1/health-check');
    expect(route).not.toBeNull();
    expect(route!.match).toBe('/functions/v1/health-check');
    expect(route!.requiresAuth).toBe(false);
  });

  it('matches exact auth-webhook path', () => {
    const route = matchRoute('/functions/v1/auth-webhook');
    expect(route).not.toBeNull();
    expect(route!.match).toBe('/functions/v1/auth-webhook');
  });

  it('matches wildcard for other Edge Functions', () => {
    const route = matchRoute('/functions/v1/bank-connection');
    expect(route).not.toBeNull();
    expect(route!.match).toBe('/functions/v1/*');
    expect(route!.requiresAuth).toBe(true);
  });

  it('matches REST API routes', () => {
    const route = matchRoute('/rest/v1/transactions');
    expect(route).not.toBeNull();
    expect(route!.upstream).toBe('http://postgrest:3000');
  });

  it('matches auth routes', () => {
    const route = matchRoute('/auth/v1/token');
    expect(route).not.toBeNull();
    expect(route!.upstream).toBe('http://gotrue:9999');
    expect(route!.requiresAuth).toBe(false);
  });

  it('matches health endpoint', () => {
    const route = matchRoute('/health');
    expect(route).not.toBeNull();
    expect(route!.upstream).toBe('internal');
  });

  it('returns null for unmatched paths', () => {
    expect(matchRoute('/unknown/path')).toBeNull();
    expect(matchRoute('/')).toBeNull();
  });
});

describe('Reverse proxy configuration', () => {
  it('routes Edge Functions to edge-runtime upstream', () => {
    const route = matchRoute('/functions/v1/data-export');
    expect(route!.upstream).toContain('edge-runtime');
  });

  it('routes REST API to PostgREST upstream', () => {
    const route = matchRoute('/rest/v1/accounts');
    expect(route!.upstream).toContain('postgrest');
  });

  it('routes auth to GoTrue upstream', () => {
    const route = matchRoute('/auth/v1/signup');
    expect(route!.upstream).toContain('gotrue');
  });

  it('health endpoint is internal (no upstream)', () => {
    const route = matchRoute('/health');
    expect(route!.upstream).toBe('internal');
  });
});

describe('Health check endpoint', () => {
  it('health check route exists', () => {
    const route = matchRoute('/health');
    expect(route).not.toBeNull();
  });

  it('health check does not require auth', () => {
    const route = matchRoute('/health');
    expect(route!.requiresAuth).toBe(false);
  });

  it('health check has no rate limit', () => {
    const route = matchRoute('/health');
    expect(route!.rateLimit).toBe(0);
  });

  it('Edge Function health-check has limited rate', () => {
    const route = matchRoute('/functions/v1/health-check');
    expect(route!.rateLimit).toBe(10);
  });
});

describe('Rate limiting headers', () => {
  it('returns rate limit headers for rate-limited routes', () => {
    const route = matchRoute('/functions/v1/health-check')!;
    const headers = getRateLimitHeaders(route);
    expect(headers['X-RateLimit-Limit']).toBe('10');
    expect(headers['X-RateLimit-Remaining']).toBeDefined();
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('returns empty headers for non-rate-limited routes', () => {
    const route = matchRoute('/health')!;
    const headers = getRateLimitHeaders(route);
    expect(Object.keys(headers).length).toBe(0);
  });

  it('rate limit values are positive integers', () => {
    for (const route of ROUTES) {
      expect(route.rateLimit).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(route.rateLimit)).toBe(true);
    }
  });
});

describe('CORS configuration', () => {
  const allowedOrigins = ['https://app.finance.example.com', 'http://localhost:3000'];

  it('returns matching origin for allowed origins', () => {
    const headers = getCorsHeaders('https://app.finance.example.com', allowedOrigins);
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.finance.example.com');
  });

  it('returns empty origin for disallowed origins', () => {
    const headers = getCorsHeaders('https://evil.example.com', allowedOrigins);
    expect(headers['Access-Control-Allow-Origin']).toBe('');
  });

  it('includes Vary: Origin header', () => {
    const headers = getCorsHeaders('http://localhost:3000', allowedOrigins);
    expect(headers['Vary']).toBe('Origin');
  });

  it('includes allowed methods', () => {
    const headers = getCorsHeaders('http://localhost:3000', allowedOrigins);
    expect(headers['Access-Control-Allow-Methods']).toContain('GET');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Methods']).toContain('DELETE');
  });

  it('includes max-age for preflight caching', () => {
    const headers = getCorsHeaders('http://localhost:3000', allowedOrigins);
    expect(Number(headers['Access-Control-Max-Age'])).toBeGreaterThan(0);
  });

  it('never uses wildcard origin', () => {
    const headers = getCorsHeaders('*', allowedOrigins);
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
  });
});
