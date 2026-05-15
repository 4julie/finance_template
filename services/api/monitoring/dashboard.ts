// SPDX-License-Identifier: BUSL-1.1

/**
 * Dashboard data aggregation for the Finance API (#1386).
 *
 * Provides functions to compute key operational metrics:
 * - Percentile response times (p50 / p95 / p99)
 * - Error-rate percentage
 * - Sync-health summary
 * - Time-bucketed aggregation (1m, 5m, 1h, 1d)
 *
 * All outputs are plain JSON-serialisable objects suitable for
 * rendering in an admin dashboard or shipping to a monitoring backend.
 *
 * **No PII or financial data is ever included in dashboard payloads.**
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported time-bucket sizes. */
export type TimeBucket = '1m' | '5m' | '1h' | '1d';

/** A single time-bucketed data point. */
export interface BucketedDataPoint {
  /** ISO 8601 timestamp of the bucket start. */
  bucketStart: string;
  /** Number of observations in this bucket. */
  count: number;
  /** Sum of values in this bucket (for average computation). */
  sum: number;
}

/** Percentile response-time summary. */
export interface ResponseTimePercentiles {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  count: number;
}

/** Full dashboard snapshot. */
export interface DashboardSnapshot {
  /** ISO 8601 timestamp when the snapshot was taken. */
  timestamp: string;
  responseTimes: ResponseTimePercentiles;
  errorRatePercent: number;
  activeConnections: number;
  syncHealth: SyncHealthSummary;
}

/** Sync-health summary for the dashboard. */
export interface SyncHealthSummary {
  totalOperations: number;
  averageDurationMs: number;
  totalRecordsSynced: number;
  totalConflicts: number;
  conflictRate: number;
}

// ---------------------------------------------------------------------------
// Percentile calculation
// ---------------------------------------------------------------------------

/**
 * Compute the value at a given percentile from a sorted array.
 *
 * Uses the "nearest rank" method.
 *
 * @param sorted  Array of numbers sorted ascending.
 * @param percentile A value between 0 and 100.
 */
export function percentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1);
  return sorted[index];
}

/**
 * Compute p50, p95, p99, min, and max from an array of response times.
 *
 * @param times Array of response-time values in milliseconds.
 */
export function computeResponseTimePercentiles(times: number[]): ResponseTimePercentiles {
  if (times.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = [...times].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

// ---------------------------------------------------------------------------
// Error rate
// ---------------------------------------------------------------------------

/**
 * Compute error-rate percentage from total and error counts.
 *
 * @param totalRequests Total number of requests.
 * @param errorRequests Number of requests with status ≥ 400.
 * @returns Percentage (0–100), or 0 when no requests exist.
 */
export function computeErrorRatePercent(totalRequests: number, errorRequests: number): number {
  if (totalRequests <= 0) return 0;
  return (errorRequests / totalRequests) * 100;
}

// ---------------------------------------------------------------------------
// Sync health
// ---------------------------------------------------------------------------

/**
 * Build a sync-health summary from raw metrics.
 *
 * @param totalOps       Total sync operations.
 * @param totalDurationMs Sum of all sync durations.
 * @param totalRecords   Total records synced.
 * @param totalConflicts Total merge conflicts.
 */
export function computeSyncHealth(
  totalOps: number,
  totalDurationMs: number,
  totalRecords: number,
  totalConflicts: number,
): SyncHealthSummary {
  return {
    totalOperations: totalOps,
    averageDurationMs: totalOps === 0 ? 0 : Math.round(totalDurationMs / totalOps),
    totalRecordsSynced: totalRecords,
    totalConflicts,
    conflictRate: totalOps === 0 ? 0 : totalConflicts / totalOps,
  };
}

// ---------------------------------------------------------------------------
// Time-bucketed aggregation
// ---------------------------------------------------------------------------

/** Map from bucket name to duration in milliseconds. */
const BUCKET_DURATIONS: Record<TimeBucket, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '1h': 3_600_000,
  '1d': 86_400_000,
};

/**
 * Aggregate timestamped values into fixed-width time buckets.
 *
 * @param dataPoints Array of `{ timestamp, value }` entries.
 * @param bucket     The bucket size to use.
 * @returns Array of bucketed data points sorted by bucket start time.
 */
export function aggregateByTimeBucket(
  dataPoints: Array<{ timestamp: number; value: number }>,
  bucket: TimeBucket,
): BucketedDataPoint[] {
  const durationMs = BUCKET_DURATIONS[bucket];
  const buckets = new Map<number, { count: number; sum: number }>();

  for (const dp of dataPoints) {
    const bucketStart = Math.floor(dp.timestamp / durationMs) * durationMs;
    const existing = buckets.get(bucketStart);
    if (existing) {
      existing.count++;
      existing.sum += dp.value;
    } else {
      buckets.set(bucketStart, { count: 1, sum: dp.value });
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([start, data]) => ({
      bucketStart: new Date(start).toISOString(),
      count: data.count,
      sum: data.sum,
    }));
}

// ---------------------------------------------------------------------------
// Dashboard snapshot builder
// ---------------------------------------------------------------------------

/**
 * Build a full dashboard snapshot from component metrics.
 *
 * This is a pure function — it does not read global state. The caller
 * is responsible for collecting the inputs from the metrics module.
 */
export function buildDashboardSnapshot(params: {
  responseTimes: number[];
  totalRequests: number;
  errorRequests: number;
  activeConnections: number;
  syncTotalOps: number;
  syncTotalDurationMs: number;
  syncTotalRecords: number;
  syncTotalConflicts: number;
}): DashboardSnapshot {
  return {
    timestamp: new Date().toISOString(),
    responseTimes: computeResponseTimePercentiles(params.responseTimes),
    errorRatePercent: computeErrorRatePercent(params.totalRequests, params.errorRequests),
    activeConnections: params.activeConnections,
    syncHealth: computeSyncHealth(
      params.syncTotalOps,
      params.syncTotalDurationMs,
      params.syncTotalRecords,
      params.syncTotalConflicts,
    ),
  };
}
