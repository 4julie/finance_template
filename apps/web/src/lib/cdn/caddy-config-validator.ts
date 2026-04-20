// SPDX-License-Identifier: BUSL-1.1

/**
 * Caddy configuration validator.
 *
 * Provides a simple line-by-line parser that extracts cache policy directives
 * and route patterns from the Caddyfile, enabling tests to verify that the
 * Caddy config and TypeScript cache-policy module stay in sync.
 *
 * This is intentionally a lightweight structural check — it does NOT fully
 * parse the Caddyfile format, just enough to validate cache-control headers
 * and route presence.
 *
 * References: issue #897
 * @module lib/cdn/caddy-config-validator
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A directive extracted from the Caddyfile. */
export interface CaddyDirective {
  /** The route pattern (e.g. `/assets/*`, `/sw.js`). */
  route: string;
  /** The Cache-Control header value, if one is specified for this route. */
  cacheControl?: string;
  /** Whether this route uses `file_server`. */
  hasFileServer: boolean;
  /** Whether this route uses `try_files` (SPA fallback). */
  hasTryFiles: boolean;
  /** Whether this route proxies to an upstream service. */
  hasReverseProxy: boolean;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse a Caddyfile string and extract route-level directives.
 *
 * @param caddyfileContent - The raw text of a Caddyfile.
 * @returns An array of extracted directives, one per `handle` / `handle_path` block.
 */
export function parseCaddyDirectives(caddyfileContent: string): CaddyDirective[] {
  const directives: CaddyDirective[] = [];
  const lines = caddyfileContent.split('\n');

  let currentDirective: CaddyDirective | null = null;
  let braceDepth = 0;
  let inHandleBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip comments and empty lines
    if (line === '' || line.startsWith('#')) {
      continue;
    }

    // Track handle/handle_path blocks
    const handleMatch = line.match(/^handle(?:_path)?\s+(\/\S+)/);
    const handleDefaultMatch = line.match(/^handle\s*\{/);

    if (handleMatch) {
      currentDirective = {
        route: handleMatch[1],
        hasFileServer: false,
        hasTryFiles: false,
        hasReverseProxy: false,
      };
      inHandleBlock = true;
      braceDepth = 0;
      if (line.includes('{')) {
        braceDepth++;
      }
      continue;
    }

    if (handleDefaultMatch) {
      currentDirective = {
        route: '/*',
        hasFileServer: false,
        hasTryFiles: false,
        hasReverseProxy: false,
      };
      inHandleBlock = true;
      braceDepth = 1;
      continue;
    }

    if (inHandleBlock && currentDirective) {
      if (line.includes('{')) {
        braceDepth++;
      }
      if (line.includes('}')) {
        braceDepth--;
        if (braceDepth <= 0) {
          directives.push(currentDirective);
          currentDirective = null;
          inHandleBlock = false;
          continue;
        }
      }

      // Extract Cache-Control header
      const cacheControlMatch = line.match(/header\s+Cache-Control\s+"([^"]+)"/);
      if (cacheControlMatch) {
        currentDirective.cacheControl = cacheControlMatch[1];
      }

      // Track file_server usage
      if (line === 'file_server' || line.startsWith('file_server')) {
        currentDirective.hasFileServer = true;
      }

      // Track try_files usage
      if (line.startsWith('try_files')) {
        currentDirective.hasTryFiles = true;
      }

      // Track reverse_proxy usage
      if (line.startsWith('reverse_proxy')) {
        currentDirective.hasReverseProxy = true;
      }
    }
  }

  return directives;
}

/**
 * Check whether the Caddyfile enables compression (gzip/zstd).
 *
 * @param caddyfileContent - The raw text of a Caddyfile.
 * @returns `true` if an `encode` directive is present.
 */
export function hasCompression(caddyfileContent: string): boolean {
  return caddyfileContent.split('\n').some((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('encode ') && (trimmed.includes('gzip') || trimmed.includes('zstd'));
  });
}

/**
 * Check whether the Caddyfile contains a specific security header.
 *
 * @param caddyfileContent - The raw text of a Caddyfile.
 * @param headerName - The header name to search for (e.g. `Strict-Transport-Security`).
 * @returns `true` if the header is set in the Caddyfile.
 */
export function hasSecurityHeader(caddyfileContent: string, headerName: string): boolean {
  return caddyfileContent.includes(headerName);
}
