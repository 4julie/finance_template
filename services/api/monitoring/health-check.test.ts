// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for `monitoring/health-check.ts` (#1328).
 *
 * Validates health check runner behaviour for healthy, degraded,
 * and unhealthy scenarios, including response format verification.
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseChecker,
  createPowerSyncChecker,
  createEdgeFunctionChecker,
  runHealthCheck,
  type ComponentHealth,
} from './health-check.js';

// ---------------------------------------------------------------------------
// Helpers — mock check functions
// ---------------------------------------------------------------------------

/** Create a check function that resolves after a delay. */
function mockCheck(result: boolean, delayMs: number = 0): () => Promise<boolean> {
  return () =>
    new Promise((resolve) => {
      setTimeout(() => resolve(result), delayMs);
    });
}

/** Create a check function that rejects. */
function mockFailingCheck(): () => Promise<boolean> {
  return () => Promise.reject(new Error('connection refused'));
}

// ---------------------------------------------------------------------------
// Component checkers
// ---------------------------------------------------------------------------

describe('createDatabaseChecker', () => {
  it('returns healthy when DB responds quickly', async () => {
    const checker = createDatabaseChecker(mockCheck(true, 0));
    const result = await checker();
    expect(result.name).toBe('database');
    expect(result.status).toBe('healthy');
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('returns unhealthy when DB check returns false', async () => {
    const checker = createDatabaseChecker(mockCheck(false, 0));
    const result = await checker();
    expect(result.status).toBe('unhealthy');
    expect(result.message).toBeDefined();
  });

  it('returns unhealthy when DB check throws', async () => {
    const checker = createDatabaseChecker(mockFailingCheck());
    const result = await checker();
    expect(result.status).toBe('unhealthy');
    expect(result.message).toContain('error');
  });
});

describe('createPowerSyncChecker', () => {
  it('returns healthy when PowerSync responds quickly', async () => {
    const checker = createPowerSyncChecker(mockCheck(true, 0));
    const result = await checker();
    expect(result.name).toBe('powersync');
    expect(result.status).toBe('healthy');
  });

  it('returns unhealthy when PowerSync is unavailable', async () => {
    const checker = createPowerSyncChecker(mockCheck(false, 0));
    const result = await checker();
    expect(result.status).toBe('unhealthy');
  });

  it('returns unhealthy when PowerSync check throws', async () => {
    const checker = createPowerSyncChecker(mockFailingCheck());
    const result = await checker();
    expect(result.status).toBe('unhealthy');
  });
});

describe('createEdgeFunctionChecker', () => {
  it('returns healthy when Edge Functions are ready', async () => {
    const checker = createEdgeFunctionChecker(mockCheck(true, 0));
    const result = await checker();
    expect(result.name).toBe('edge-functions');
    expect(result.status).toBe('healthy');
  });

  it('returns unhealthy when Edge Functions are not ready', async () => {
    const checker = createEdgeFunctionChecker(mockCheck(false, 0));
    const result = await checker();
    expect(result.status).toBe('unhealthy');
  });
});

// ---------------------------------------------------------------------------
// Health check runner
// ---------------------------------------------------------------------------

describe('runHealthCheck()', () => {
  it('returns healthy when all components are healthy', async () => {
    const result = await runHealthCheck([
      createDatabaseChecker(mockCheck(true)),
      createPowerSyncChecker(mockCheck(true)),
      createEdgeFunctionChecker(mockCheck(true)),
    ]);
    expect(result.status).toBe('healthy');
    expect(result.components.length).toBe(3);
    expect(result.timestamp).toBeDefined();
    expect(result.version).toBe('1.0.0');
    expect(result.totalCheckTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('returns unhealthy when database is down', async () => {
    const result = await runHealthCheck([
      createDatabaseChecker(mockCheck(false)),
      createPowerSyncChecker(mockCheck(true)),
      createEdgeFunctionChecker(mockCheck(true)),
    ]);
    expect(result.status).toBe('unhealthy');
    const db = result.components.find((c: ComponentHealth) => c.name === 'database');
    expect(db?.status).toBe('unhealthy');
  });

  it('returns unhealthy when any component throws', async () => {
    const result = await runHealthCheck([
      createDatabaseChecker(mockFailingCheck()),
      createPowerSyncChecker(mockCheck(true)),
      createEdgeFunctionChecker(mockCheck(true)),
    ]);
    expect(result.status).toBe('unhealthy');
  });

  it('uses custom version string', async () => {
    const result = await runHealthCheck([createEdgeFunctionChecker(mockCheck(true))], '2.0.0-beta');
    expect(result.version).toBe('2.0.0-beta');
  });

  it('response format matches expected schema', async () => {
    const result = await runHealthCheck([createDatabaseChecker(mockCheck(true))]);

    // Validate shape
    expect(typeof result.status).toBe('string');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(result.status);
    expect(typeof result.timestamp).toBe('string');
    expect(() => new Date(result.timestamp)).not.toThrow();
    expect(typeof result.totalCheckTimeMs).toBe('number');
    expect(Array.isArray(result.components)).toBe(true);
    expect(typeof result.version).toBe('string');

    // Validate component shape
    for (const c of result.components) {
      expect(typeof c.name).toBe('string');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(c.status);
      expect(typeof c.responseTimeMs).toBe('number');
    }
  });

  it('handles empty checkers array', async () => {
    const result = await runHealthCheck([]);
    expect(result.status).toBe('healthy');
    expect(result.components).toEqual([]);
  });
});
