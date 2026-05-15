// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for `monitoring/metrics.ts` (#1386).
 *
 * Validates request counters, response-time histograms,
 * active-connections gauge, error-rate calculation, sync metrics,
 * and structured logging helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  incrementRequestCounter,
  getRequestCount,
  getAllRequestCounts,
  recordResponseTime,
  getResponseTimeHistogram,
  incrementActiveConnections,
  decrementActiveConnections,
  getActiveConnections,
  calculateErrorRate,
  recordSyncOperation,
  getSyncMetrics,
  createLogEntry,
  resetAllMetrics,
} from './metrics.js';

beforeEach(() => {
  resetAllMetrics();
});

// ---------------------------------------------------------------------------
// Request counter
// ---------------------------------------------------------------------------

describe('Request counter', () => {
  it('starts at zero for unknown keys', () => {
    expect(getRequestCount({ endpoint: '/test', method: 'GET', statusCode: 200 })).toBe(0);
  });

  it('increments correctly', () => {
    const key = { endpoint: '/api/health', method: 'GET', statusCode: 200 };
    incrementRequestCounter(key);
    incrementRequestCounter(key);
    incrementRequestCounter(key);
    expect(getRequestCount(key)).toBe(3);
  });

  it('tracks different keys independently', () => {
    const ok = { endpoint: '/api/data', method: 'POST', statusCode: 200 };
    const err = { endpoint: '/api/data', method: 'POST', statusCode: 500 };
    incrementRequestCounter(ok);
    incrementRequestCounter(ok);
    incrementRequestCounter(err);
    expect(getRequestCount(ok)).toBe(2);
    expect(getRequestCount(err)).toBe(1);
  });

  it('getAllRequestCounts returns a snapshot', () => {
    incrementRequestCounter({ endpoint: '/a', method: 'GET', statusCode: 200 });
    incrementRequestCounter({ endpoint: '/b', method: 'POST', statusCode: 201 });
    const all = getAllRequestCounts();
    expect(Object.keys(all).length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Response-time histogram
// ---------------------------------------------------------------------------

describe('Response-time histogram', () => {
  it('returns empty buckets with zero counts when no data recorded', () => {
    const histogram = getResponseTimeHistogram();
    expect(histogram.length).toBeGreaterThan(0);
    histogram.forEach((b) => expect(b.count).toBe(0));
  });

  it('correctly buckets recorded times', () => {
    recordResponseTime(3);
    recordResponseTime(15);
    recordResponseTime(150);
    recordResponseTime(600);
    recordResponseTime(3000);

    const histogram = getResponseTimeHistogram();
    // 3ms fits in le=5 bucket
    const bucket5 = histogram.find((b) => b.le === 5);
    expect(bucket5?.count).toBe(1);
    // 3ms, 15ms fit in le=25 bucket (cumulative)
    const bucket25 = histogram.find((b) => b.le === 25);
    expect(bucket25?.count).toBe(2);
    // All 5 fit in le=5000
    const bucket5000 = histogram.find((b) => b.le === 5000);
    expect(bucket5000?.count).toBe(5);
  });

  it('ignores negative durations', () => {
    recordResponseTime(-1);
    const histogram = getResponseTimeHistogram();
    histogram.forEach((b) => expect(b.count).toBe(0));
  });
});

// ---------------------------------------------------------------------------
// Active connections gauge
// ---------------------------------------------------------------------------

describe('Active connections gauge', () => {
  it('starts at zero', () => {
    expect(getActiveConnections()).toBe(0);
  });

  it('increments and decrements', () => {
    incrementActiveConnections();
    incrementActiveConnections();
    expect(getActiveConnections()).toBe(2);
    decrementActiveConnections();
    expect(getActiveConnections()).toBe(1);
  });

  it('does not go below zero', () => {
    decrementActiveConnections();
    decrementActiveConnections();
    expect(getActiveConnections()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Error rate
// ---------------------------------------------------------------------------

describe('Error rate calculator', () => {
  it('returns 0 when no requests', () => {
    expect(calculateErrorRate({})).toBe(0);
  });

  it('returns 0 when all requests are successful', () => {
    expect(calculateErrorRate({ 'GET:/api:200': 10, 'POST:/api:201': 5 })).toBe(0);
  });

  it('calculates error rate correctly', () => {
    const counts = {
      'GET:/api:200': 90,
      'GET:/api:500': 10,
    };
    expect(calculateErrorRate(counts)).toBeCloseTo(0.1);
  });

  it('returns 1 when all requests are errors', () => {
    expect(calculateErrorRate({ 'GET:/api:500': 5, 'POST:/api:400': 5 })).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Sync metrics
// ---------------------------------------------------------------------------

describe('Sync metrics', () => {
  it('starts at zero', () => {
    const m = getSyncMetrics();
    expect(m.totalOperations).toBe(0);
    expect(m.totalDurationMs).toBe(0);
    expect(m.totalRecordsSynced).toBe(0);
    expect(m.totalConflicts).toBe(0);
  });

  it('accumulates operations', () => {
    recordSyncOperation(100, 50, 2);
    recordSyncOperation(200, 30, 0);
    const m = getSyncMetrics();
    expect(m.totalOperations).toBe(2);
    expect(m.totalDurationMs).toBe(300);
    expect(m.totalRecordsSynced).toBe(80);
    expect(m.totalConflicts).toBe(2);
  });

  it('returns a snapshot (not a reference)', () => {
    recordSyncOperation(100, 10);
    const a = getSyncMetrics();
    recordSyncOperation(200, 20);
    const b = getSyncMetrics();
    expect(a.totalOperations).toBe(1);
    expect(b.totalOperations).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Structured logging
// ---------------------------------------------------------------------------

describe('Structured logging helpers', () => {
  it('creates a log entry with timestamp and level', () => {
    const entry = createLogEntry('info', 'test message');
    expect(entry.level).toBe('info');
    expect(entry.message).toBe('test message');
    expect(entry.timestamp).toBeDefined();
    expect(() => new Date(entry.timestamp)).not.toThrow();
  });

  it('includes context fields', () => {
    const entry = createLogEntry('error', 'fail', { httpStatus: 500, endpoint: '/api' });
    expect(entry.httpStatus).toBe(500);
    expect(entry.endpoint).toBe('/api');
  });

  it('never includes PII fields in output', () => {
    const entry = createLogEntry('info', 'request', { requestId: 'abc-123' });
    const json = JSON.stringify(entry);
    expect(json).not.toContain('password');
    expect(json).not.toContain('email');
    expect(json).not.toContain('accountNumber');
  });
});
