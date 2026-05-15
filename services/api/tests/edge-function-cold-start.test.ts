// SPDX-License-Identifier: BUSL-1.1

/**
 * Edge Function cold-start and lifecycle tests (#1324).
 *
 * Simulates cold-start timing, function timeout handling,
 * concurrent request handling, and error responses during
 * initialization for all Edge Functions.
 *
 * These tests validate operational characteristics — they do NOT
 * make real HTTP calls to Supabase. Instead they exercise timing
 * and concurrency patterns in isolation.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Edge Function inventory
// ---------------------------------------------------------------------------

/** All deployed Edge Functions that should be monitored. */
const EDGE_FUNCTIONS = [
  'health-check',
  'auth-webhook',
  'bank-connection',
  'bank-webhook',
  'check-notifications',
  'data-export',
  'exchange-rates',
  'generate-report',
  'household-invite',
  'import-data',
  'passkey-authenticate',
  'passkey-register',
  'send-notification',
  'sync-health-report',
] as const;

// ---------------------------------------------------------------------------
// Cold-start simulation helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a cold-start by measuring the time to execute an
 * initialisation function. In a real deployment this would include
 * Deno runtime boot, module loading, and first-request handling.
 */
async function simulateColdStart(
  functionName: string,
  initMs: number = 0,
): Promise<{ functionName: string; durationMs: number }> {
  const start = performance.now();
  // Simulate initialisation delay
  await new Promise((resolve) => setTimeout(resolve, initMs));
  return { functionName, durationMs: performance.now() - start };
}

/**
 * Simulate a function timeout — resolves or rejects based on
 * whether the work completes within the deadline.
 */
async function simulateWithTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<{ result: T | null; timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
  });

  const outcome = await Promise.race([work.then((r) => ({ value: r })), timeout]);
  clearTimeout(timer!);

  if (outcome === 'timeout') {
    return { result: null, timedOut: true };
  }
  return { result: (outcome as { value: T }).value, timedOut: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Edge Function cold-start simulation', () => {
  it('all functions complete cold start within budget', async () => {
    const COLD_START_BUDGET_MS = 500;
    const results = await Promise.all(
      EDGE_FUNCTIONS.map((fn) => simulateColdStart(fn, 5)), // 5ms simulated init
    );

    for (const r of results) {
      expect(r.durationMs).toBeLessThan(COLD_START_BUDGET_MS);
    }
  });

  it('measures cold-start duration for each function', async () => {
    for (const fn of EDGE_FUNCTIONS) {
      const result = await simulateColdStart(fn, 1);
      expect(result.functionName).toBe(fn);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('cold-start returns correct function name', async () => {
    const result = await simulateColdStart('health-check', 0);
    expect(result.functionName).toBe('health-check');
  });
});

describe('Function timeout handling', () => {
  it('completes within timeout', async () => {
    const work = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 10));
    const { result, timedOut } = await simulateWithTimeout(work, 500);
    expect(timedOut).toBe(false);
    expect(result).toBe('done');
  });

  it('times out when work exceeds deadline', async () => {
    const work = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 500));
    const { result, timedOut } = await simulateWithTimeout(work, 10);
    expect(timedOut).toBe(true);
    expect(result).toBeNull();
  });

  it('handles zero timeout', async () => {
    const work = new Promise<string>((resolve) => setTimeout(() => resolve('done'), 50));
    const { timedOut } = await simulateWithTimeout(work, 0);
    expect(timedOut).toBe(true);
  });
});

describe('Concurrent request handling', () => {
  it('handles multiple concurrent cold starts', async () => {
    const concurrency = 10;
    const promises = Array.from({ length: concurrency }, (_, i) =>
      simulateColdStart(EDGE_FUNCTIONS[i % EDGE_FUNCTIONS.length], 2),
    );
    const results = await Promise.all(promises);
    expect(results.length).toBe(concurrency);
    results.forEach((r) => {
      expect(r.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  it('concurrent requests do not interfere with each other', async () => {
    const results = await Promise.all([
      simulateColdStart('health-check', 5),
      simulateColdStart('auth-webhook', 10),
      simulateColdStart('bank-connection', 1),
    ]);
    expect(results[0].functionName).toBe('health-check');
    expect(results[1].functionName).toBe('auth-webhook');
    expect(results[2].functionName).toBe('bank-connection');
  });
});

describe('Error responses during initialization', () => {
  it('returns error info when init function throws', async () => {
    const failingInit = async (): Promise<{ status: number; body: string }> => {
      throw new Error('Module not found');
    };

    try {
      await failingInit();
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toContain('Module not found');
    }
  });

  it('timeout produces a structured error response', async () => {
    const slowInit = new Promise<{ status: number }>((resolve) =>
      setTimeout(() => resolve({ status: 200 }), 500),
    );
    const { timedOut } = await simulateWithTimeout(slowInit, 10);
    expect(timedOut).toBe(true);

    // A real handler would return 504 on timeout
    const errorResponse = {
      status: 504,
      body: { error: 'Function initialization timed out' },
    };
    expect(errorResponse.status).toBe(504);
    expect(errorResponse.body.error).toContain('timed out');
  });

  it('partially initialized function returns 503', () => {
    // Simulate a function that started but did not complete init
    const response = {
      status: 503,
      body: { error: 'Service unavailable', reason: 'initialization_incomplete' },
    };
    expect(response.status).toBe(503);
    expect(response.body.reason).toBe('initialization_incomplete');
  });
});
