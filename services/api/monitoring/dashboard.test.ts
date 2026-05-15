// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for `monitoring/dashboard.ts` (#1386).
 *
 * Validates percentile computation, error-rate calculation,
 * sync-health summarisation, time-bucketed aggregation, and the
 * full dashboard snapshot builder.
 */

import { describe, it, expect } from 'vitest';
import {
  percentile,
  computeResponseTimePercentiles,
  computeErrorRatePercent,
  computeSyncHealth,
  aggregateByTimeBucket,
  buildDashboardSnapshot,
} from './dashboard.js';

// ---------------------------------------------------------------------------
// Percentile
// ---------------------------------------------------------------------------

describe('percentile()', () => {
  it('returns 0 for an empty array', () => {
    expect(percentile([], 50)).toBe(0);
  });

  it('returns the single element for a 1-element array', () => {
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 99)).toBe(42);
  });

  it('computes p50 correctly', () => {
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(sorted, 50)).toBe(5);
  });

  it('computes p99 correctly', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(sorted, 99)).toBe(99);
  });
});

describe('computeResponseTimePercentiles()', () => {
  it('returns zeros for empty input', () => {
    const result = computeResponseTimePercentiles([]);
    expect(result.p50).toBe(0);
    expect(result.p95).toBe(0);
    expect(result.p99).toBe(0);
    expect(result.count).toBe(0);
  });

  it('computes correct percentiles for a dataset', () => {
    // 100 values: 1..100
    const times = Array.from({ length: 100 }, (_, i) => i + 1);
    const result = computeResponseTimePercentiles(times);
    expect(result.p50).toBe(50);
    expect(result.p95).toBe(95);
    expect(result.p99).toBe(99);
    expect(result.min).toBe(1);
    expect(result.max).toBe(100);
    expect(result.count).toBe(100);
  });

  it('handles unsorted input', () => {
    const times = [100, 1, 50, 25, 75];
    const result = computeResponseTimePercentiles(times);
    expect(result.min).toBe(1);
    expect(result.max).toBe(100);
    expect(result.count).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Error rate
// ---------------------------------------------------------------------------

describe('computeErrorRatePercent()', () => {
  it('returns 0 for zero total requests', () => {
    expect(computeErrorRatePercent(0, 0)).toBe(0);
  });

  it('returns 0 when no errors', () => {
    expect(computeErrorRatePercent(100, 0)).toBe(0);
  });

  it('returns 100 when all errors', () => {
    expect(computeErrorRatePercent(50, 50)).toBe(100);
  });

  it('computes percentage correctly', () => {
    expect(computeErrorRatePercent(200, 10)).toBeCloseTo(5);
  });
});

// ---------------------------------------------------------------------------
// Sync health
// ---------------------------------------------------------------------------

describe('computeSyncHealth()', () => {
  it('returns zero averages when no operations', () => {
    const health = computeSyncHealth(0, 0, 0, 0);
    expect(health.averageDurationMs).toBe(0);
    expect(health.conflictRate).toBe(0);
  });

  it('computes averages correctly', () => {
    const health = computeSyncHealth(10, 5000, 200, 3);
    expect(health.averageDurationMs).toBe(500);
    expect(health.conflictRate).toBeCloseTo(0.3);
    expect(health.totalRecordsSynced).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Time-bucketed aggregation
// ---------------------------------------------------------------------------

describe('aggregateByTimeBucket()', () => {
  it('returns empty array for no data', () => {
    expect(aggregateByTimeBucket([], '1m')).toEqual([]);
  });

  it('groups data into 1-minute buckets', () => {
    const base = new Date('2025-01-01T00:00:00Z').getTime();
    const data = [
      { timestamp: base, value: 10 },
      { timestamp: base + 30_000, value: 20 }, // same minute
      { timestamp: base + 60_000, value: 30 }, // next minute
    ];
    const buckets = aggregateByTimeBucket(data, '1m');
    expect(buckets.length).toBe(2);
    expect(buckets[0].count).toBe(2);
    expect(buckets[0].sum).toBe(30);
    expect(buckets[1].count).toBe(1);
    expect(buckets[1].sum).toBe(30);
  });

  it('groups data into 1-hour buckets', () => {
    const base = new Date('2025-01-01T00:00:00Z').getTime();
    const data = [
      { timestamp: base, value: 1 },
      { timestamp: base + 30 * 60_000, value: 2 }, // same hour
      { timestamp: base + 61 * 60_000, value: 3 }, // next hour
    ];
    const buckets = aggregateByTimeBucket(data, '1h');
    expect(buckets.length).toBe(2);
  });

  it('sorts buckets chronologically', () => {
    const base = new Date('2025-01-01T00:00:00Z').getTime();
    const data = [
      { timestamp: base + 120_000, value: 3 },
      { timestamp: base, value: 1 },
      { timestamp: base + 60_000, value: 2 },
    ];
    const buckets = aggregateByTimeBucket(data, '1m');
    const starts = buckets.map((b) => new Date(b.bucketStart).getTime());
    for (let i = 1; i < starts.length; i++) {
      expect(starts[i]).toBeGreaterThan(starts[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// Dashboard snapshot
// ---------------------------------------------------------------------------

describe('buildDashboardSnapshot()', () => {
  it('builds a complete snapshot', () => {
    const snapshot = buildDashboardSnapshot({
      responseTimes: [10, 20, 30, 40, 50],
      totalRequests: 100,
      errorRequests: 5,
      activeConnections: 12,
      syncTotalOps: 10,
      syncTotalDurationMs: 5000,
      syncTotalRecords: 200,
      syncTotalConflicts: 2,
    });

    expect(snapshot.timestamp).toBeDefined();
    expect(snapshot.responseTimes.count).toBe(5);
    expect(snapshot.errorRatePercent).toBeCloseTo(5);
    expect(snapshot.activeConnections).toBe(12);
    expect(snapshot.syncHealth.totalOperations).toBe(10);
    expect(snapshot.syncHealth.averageDurationMs).toBe(500);
  });

  it('handles empty response times', () => {
    const snapshot = buildDashboardSnapshot({
      responseTimes: [],
      totalRequests: 0,
      errorRequests: 0,
      activeConnections: 0,
      syncTotalOps: 0,
      syncTotalDurationMs: 0,
      syncTotalRecords: 0,
      syncTotalConflicts: 0,
    });
    expect(snapshot.responseTimes.p50).toBe(0);
    expect(snapshot.errorRatePercent).toBe(0);
  });
});
