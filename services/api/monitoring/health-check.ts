// SPDX-License-Identifier: BUSL-1.1

/**
 * Comprehensive health-check endpoint implementation (#1328).
 *
 * Checks database connectivity, PowerSync endpoint availability,
 * and Edge Function readiness. Returns a structured health status
 * with per-component details and response-time metrics.
 *
 * **Security:** No connection strings, credentials, schema details,
 * or financial data are ever included in the response.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Status of an individual component. */
export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy';

/** Health details for a single component. */
export interface ComponentHealth {
  name: string;
  status: ComponentStatus;
  responseTimeMs: number;
  message?: string;
}

/** Overall health check response. */
export interface HealthCheckResult {
  /** Aggregate status — `healthy` only if ALL components are healthy. */
  status: ComponentStatus;
  /** ISO 8601 timestamp when the check was performed. */
  timestamp: string;
  /** Total time to run all checks in milliseconds. */
  totalCheckTimeMs: number;
  /** Per-component health details. */
  components: ComponentHealth[];
  /** Application version. */
  version: string;
}

/** Function type for individual component checks. */
export type ComponentChecker = () => Promise<ComponentHealth>;

// ---------------------------------------------------------------------------
// Component checkers
// ---------------------------------------------------------------------------

/**
 * Create a database connectivity checker.
 *
 * The checker issues a lightweight probe to the database (via the
 * provided `checkFn`) and measures response time.
 *
 * @param checkFn An async function that resolves `true` if the DB is reachable.
 */
export function createDatabaseChecker(checkFn: () => Promise<boolean>): ComponentChecker {
  return async (): Promise<ComponentHealth> => {
    const start = Date.now();
    try {
      const ok = await checkFn();
      const elapsed = Date.now() - start;
      return {
        name: 'database',
        status: ok ? (elapsed > 2000 ? 'degraded' : 'healthy') : 'unhealthy',
        responseTimeMs: elapsed,
        ...(ok ? {} : { message: 'Database connection failed' }),
        ...(ok && elapsed > 2000 ? { message: 'Database response time elevated' } : {}),
      };
    } catch {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: 'Database check threw an error',
      };
    }
  };
}

/**
 * Create a PowerSync endpoint availability checker.
 *
 * @param checkFn An async function that resolves `true` if PowerSync is reachable.
 */
export function createPowerSyncChecker(checkFn: () => Promise<boolean>): ComponentChecker {
  return async (): Promise<ComponentHealth> => {
    const start = Date.now();
    try {
      const ok = await checkFn();
      const elapsed = Date.now() - start;
      return {
        name: 'powersync',
        status: ok ? (elapsed > 3000 ? 'degraded' : 'healthy') : 'unhealthy',
        responseTimeMs: elapsed,
        ...(ok ? {} : { message: 'PowerSync endpoint unavailable' }),
        ...(ok && elapsed > 3000 ? { message: 'PowerSync response time elevated' } : {}),
      };
    } catch {
      return {
        name: 'powersync',
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: 'PowerSync check threw an error',
      };
    }
  };
}

/**
 * Create an Edge Function readiness checker.
 *
 * @param checkFn An async function that resolves `true` if Edge Functions are ready.
 */
export function createEdgeFunctionChecker(checkFn: () => Promise<boolean>): ComponentChecker {
  return async (): Promise<ComponentHealth> => {
    const start = Date.now();
    try {
      const ok = await checkFn();
      const elapsed = Date.now() - start;
      return {
        name: 'edge-functions',
        status: ok ? 'healthy' : 'unhealthy',
        responseTimeMs: elapsed,
        ...(ok ? {} : { message: 'Edge Functions not ready' }),
      };
    } catch {
      return {
        name: 'edge-functions',
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        message: 'Edge Function check threw an error',
      };
    }
  };
}

// ---------------------------------------------------------------------------
// Health check runner
// ---------------------------------------------------------------------------

/**
 * Run all component health checks concurrently and produce an
 * aggregated {@link HealthCheckResult}.
 *
 * @param checkers Array of component checker functions.
 * @param version  Application version string.
 */
export async function runHealthCheck(
  checkers: ComponentChecker[],
  version: string = '1.0.0',
): Promise<HealthCheckResult> {
  const start = Date.now();
  const components = await Promise.all(checkers.map((check) => check()));
  const totalCheckTimeMs = Date.now() - start;

  // Aggregate status — worst-case wins
  let status: ComponentStatus = 'healthy';
  for (const c of components) {
    if (c.status === 'unhealthy') {
      status = 'unhealthy';
      break;
    }
    if (c.status === 'degraded') {
      status = 'degraded';
    }
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    totalCheckTimeMs,
    components,
    version,
  };
}
