// SPDX-License-Identifier: BUSL-1.1

/**
 * Observability metrics collection for the Finance API (#1386).
 *
 * Provides in-process counters, histograms, and gauges for request
 * tracking, response-time measurement, and sync-operation monitoring.
 *
 * All metrics are structured as plain objects so they can be serialised
 * to JSON for log aggregation. **No PII or financial data is ever
 * recorded** — only operational telemetry (counts, durations, status
 * codes, endpoint paths).
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single counter data-point keyed by endpoint, method, and status. */
export interface RequestCounterKey {
  endpoint: string;
  method: string;
  statusCode: number;
}

/** Histogram bucket for response-time distribution. */
export interface HistogramBucket {
  le: number; // upper-bound in ms
  count: number;
}

/** Snapshot of sync-operation metrics. */
export interface SyncMetrics {
  totalOperations: number;
  totalDurationMs: number;
  totalRecordsSynced: number;
  totalConflicts: number;
}

/** Structured log entry produced by the logging helpers. */
export interface StructuredLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Request counter
// ---------------------------------------------------------------------------

/** In-memory request counter map. */
const requestCounts = new Map<string, number>();

/** Build a deterministic map key from counter dimensions. */
function counterKey(k: RequestCounterKey): string {
  return `${k.method}:${k.endpoint}:${k.statusCode}`;
}

/**
 * Increment the request counter for the given dimensions.
 *
 * @param key Endpoint, HTTP method, and response status code.
 */
export function incrementRequestCounter(key: RequestCounterKey): void {
  const k = counterKey(key);
  requestCounts.set(k, (requestCounts.get(k) ?? 0) + 1);
}

/**
 * Return the current count for a specific counter key.
 *
 * @returns The count, or `0` if the key has never been incremented.
 */
export function getRequestCount(key: RequestCounterKey): number {
  return requestCounts.get(counterKey(key)) ?? 0;
}

/** Return all recorded request counts as a plain object snapshot. */
export function getAllRequestCounts(): Record<string, number> {
  const snapshot: Record<string, number> = {};
  for (const [k, v] of requestCounts) {
    snapshot[k] = v;
  }
  return snapshot;
}

/** Reset all request counters (useful in tests). */
export function resetRequestCounters(): void {
  requestCounts.clear();
}

// ---------------------------------------------------------------------------
// Response-time histogram
// ---------------------------------------------------------------------------

/** Default histogram bucket boundaries (milliseconds). */
const DEFAULT_BUCKETS: readonly number[] = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

/** Recorded response times for histogram computation. */
const responseTimes: number[] = [];

/**
 * Record a response duration for histogram aggregation.
 *
 * @param durationMs Duration in milliseconds (non-negative).
 */
export function recordResponseTime(durationMs: number): void {
  if (durationMs >= 0) {
    responseTimes.push(durationMs);
  }
}

/**
 * Get the response-time histogram using the default bucket boundaries.
 *
 * Each bucket contains the **cumulative** count of observations ≤ `le`.
 */
export function getResponseTimeHistogram(
  buckets: readonly number[] = DEFAULT_BUCKETS,
): HistogramBucket[] {
  return buckets.map((le) => ({
    le,
    count: responseTimes.filter((t) => t <= le).length,
  }));
}

/** Reset recorded response times (useful in tests). */
export function resetResponseTimes(): void {
  responseTimes.length = 0;
}

// ---------------------------------------------------------------------------
// Active connections gauge
// ---------------------------------------------------------------------------

let activeConnections = 0;

/** Increment the active-connections gauge. */
export function incrementActiveConnections(): void {
  activeConnections++;
}

/** Decrement the active-connections gauge (floor at 0). */
export function decrementActiveConnections(): void {
  activeConnections = Math.max(0, activeConnections - 1);
}

/** Return the current active-connections gauge value. */
export function getActiveConnections(): number {
  return activeConnections;
}

/** Reset the active-connections gauge (useful in tests). */
export function resetActiveConnections(): void {
  activeConnections = 0;
}

// ---------------------------------------------------------------------------
// Error-rate calculator
// ---------------------------------------------------------------------------

/**
 * Calculate the error rate from a set of request counts.
 *
 * An error is any response with `statusCode >= 400`.
 *
 * @returns A value between 0 and 1 (inclusive), or 0 when no requests exist.
 */
export function calculateErrorRate(counts: Record<string, number>): number {
  let total = 0;
  let errors = 0;

  for (const [key, count] of Object.entries(counts)) {
    total += count;
    // key format: "METHOD:endpoint:statusCode"
    const statusStr = key.split(':').pop();
    const status = Number(statusStr);
    if (!isNaN(status) && status >= 400) {
      errors += count;
    }
  }

  return total === 0 ? 0 : errors / total;
}

// ---------------------------------------------------------------------------
// Sync-operation metrics
// ---------------------------------------------------------------------------

const syncMetrics: SyncMetrics = {
  totalOperations: 0,
  totalDurationMs: 0,
  totalRecordsSynced: 0,
  totalConflicts: 0,
};

/**
 * Record a completed sync operation.
 *
 * @param durationMs    How long the sync took.
 * @param recordsSynced Number of records transferred.
 * @param conflicts     Number of merge conflicts encountered.
 */
export function recordSyncOperation(
  durationMs: number,
  recordsSynced: number,
  conflicts: number = 0,
): void {
  syncMetrics.totalOperations++;
  syncMetrics.totalDurationMs += durationMs;
  syncMetrics.totalRecordsSynced += recordsSynced;
  syncMetrics.totalConflicts += conflicts;
}

/** Return a snapshot of sync-operation metrics. */
export function getSyncMetrics(): SyncMetrics {
  return { ...syncMetrics };
}

/** Reset sync metrics (useful in tests). */
export function resetSyncMetrics(): void {
  syncMetrics.totalOperations = 0;
  syncMetrics.totalDurationMs = 0;
  syncMetrics.totalRecordsSynced = 0;
  syncMetrics.totalConflicts = 0;
}

// ---------------------------------------------------------------------------
// Structured logging helpers
// ---------------------------------------------------------------------------

/**
 * Create a structured JSON log entry.
 *
 * **Security:** Never include PII, account numbers, balances, or
 * transaction details. Only operational fields are allowed.
 */
export function createLogEntry(
  level: StructuredLogEntry['level'],
  message: string,
  context?: Record<string, unknown>,
): StructuredLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
}

/**
 * Emit a structured log entry to the console as JSON.
 *
 * Routes to the appropriate console method based on log level.
 */
export function emitLog(entry: StructuredLogEntry): void {
  const json = JSON.stringify(entry);
  switch (entry.level) {
    case 'error':
      console.error(json);
      break;
    case 'warn':
      console.warn(json);
      break;
    case 'debug':
      console.debug(json);
      break;
    default:
      console.log(json);
  }
}

// ---------------------------------------------------------------------------
// Full reset (tests)
// ---------------------------------------------------------------------------

/** Reset all metrics state — intended for test isolation. */
export function resetAllMetrics(): void {
  resetRequestCounters();
  resetResponseTimes();
  resetActiveConnections();
  resetSyncMetrics();
}
