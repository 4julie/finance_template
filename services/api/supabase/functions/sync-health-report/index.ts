// SPDX-License-Identifier: BUSL-1.1

/**
 * Sync Health Report Edge Function (#610, #1050)
 *
 * Two modes:
 *   POST — Accept sync health metrics from authenticated clients and insert
 *          them into the `sync_health_logs` table (existing functionality).
 *   GET  — Return a comprehensive sync health analysis with per-device stats,
 *          error rates, conflict resolution metrics, and a health score (0-100)
 *          with actionable recommendations (#1050).
 *
 * Security:
 *   - Requires authentication (valid JWT)
 *   - POST: Input validated and bounded (max lengths, allowed values)
 *   - GET: Only returns data for the authenticated user's sync history
 *   - error_message is sanitized to strip potential PII / financial data
 *   - NEVER logs actual error_message content (may contain sensitive info)
 *   - Rate limited via shared checkRateLimit(): max 60 reports per user per hour
 *   - Origin-validated CORS (no wildcard)
 *
 * Environment Variables:
 *   SUPABASE_URL              — Project URL (set automatically by Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (set automatically by Supabase)
 *   ALLOWED_ORIGINS           — Comma-separated list of allowed CORS origins
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createAdminClient, requireAuth } from '../_shared/auth.ts';
import { handleCorsPreflightRequest } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { validateEnv } from '../_shared/env.ts';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '../_shared/rate-limit.ts';
import {
  createdResponse,
  errorResponse,
  internalErrorResponse,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/response.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Valid sync status values (must match the CHECK constraint on the table). */
const VALID_SYNC_STATUSES = ['success', 'failure', 'partial'] as const;
type SyncStatus = (typeof VALID_SYNC_STATUSES)[number];

/** Maximum device_id length. */
const MAX_DEVICE_ID_LENGTH = 255;

/** Maximum sync duration in milliseconds (1 hour). */
const MAX_SYNC_DURATION_MS = 3_600_000;

/** Maximum error_code length. */
const MAX_ERROR_CODE_LENGTH = 100;

/** Maximum error_message length (before sanitization). */
const MAX_ERROR_MESSAGE_LENGTH = 500;

/** Health score thresholds. */
const HEALTH_EXCELLENT = 90;
const HEALTH_GOOD = 70;
const HEALTH_FAIR = 50;

/** Default analysis window in days. */
const DEFAULT_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;

// ---------------------------------------------------------------------------
// PII / Financial Data Sanitisation
// ---------------------------------------------------------------------------

const PII_PATTERNS: readonly RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{0,7}\b/g,
  /\b\d{3}-\d{2}-\d{4}\b/g,
  /[$€£¥]\s?\d[\d,.\s]*\d/g,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
];

function sanitizeErrorMessage(raw: string): string {
  let sanitized = raw;
  for (const pattern of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

// ---------------------------------------------------------------------------
// POST input validation
// ---------------------------------------------------------------------------

interface SyncHealthReport {
  device_id: string;
  sync_duration_ms: number;
  record_count: number;
  error_code?: string;
  error_message?: string;
  sync_status: SyncStatus;
}

function validateBody(body: unknown): { report: SyncHealthReport } | { error: string } {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object' };
  }

  const b = body as Record<string, unknown>;

  if (typeof b.device_id !== 'string' || b.device_id.length === 0) {
    return { error: 'device_id is required and must be a non-empty string' };
  }
  if (b.device_id.length > MAX_DEVICE_ID_LENGTH) {
    return { error: `device_id must be at most ${MAX_DEVICE_ID_LENGTH} characters` };
  }

  if (typeof b.sync_duration_ms !== 'number' || !Number.isInteger(b.sync_duration_ms)) {
    return { error: 'sync_duration_ms is required and must be an integer' };
  }
  if (b.sync_duration_ms < 0) {
    return { error: 'sync_duration_ms must be >= 0' };
  }
  if (b.sync_duration_ms > MAX_SYNC_DURATION_MS) {
    return { error: `sync_duration_ms must be at most ${MAX_SYNC_DURATION_MS}` };
  }

  if (typeof b.record_count !== 'number' || !Number.isInteger(b.record_count)) {
    return { error: 'record_count is required and must be an integer' };
  }
  if (b.record_count < 0) {
    return { error: 'record_count must be >= 0' };
  }

  if (typeof b.sync_status !== 'string') {
    return { error: 'sync_status is required and must be a string' };
  }
  if (!(VALID_SYNC_STATUSES as readonly string[]).includes(b.sync_status)) {
    return { error: `sync_status must be one of: ${VALID_SYNC_STATUSES.join(', ')}` };
  }

  if (b.error_code !== undefined && b.error_code !== null) {
    if (typeof b.error_code !== 'string') {
      return { error: 'error_code must be a string' };
    }
    if (b.error_code.length > MAX_ERROR_CODE_LENGTH) {
      return { error: `error_code must be at most ${MAX_ERROR_CODE_LENGTH} characters` };
    }
  }

  if (b.error_message !== undefined && b.error_message !== null) {
    if (typeof b.error_message !== 'string') {
      return { error: 'error_message must be a string' };
    }
    if (b.error_message.length > MAX_ERROR_MESSAGE_LENGTH) {
      return { error: `error_message must be at most ${MAX_ERROR_MESSAGE_LENGTH} characters` };
    }
  }

  return {
    report: {
      device_id: b.device_id,
      sync_duration_ms: b.sync_duration_ms,
      record_count: b.record_count,
      sync_status: b.sync_status as SyncStatus,
      ...(b.error_code ? { error_code: b.error_code as string } : {}),
      ...(b.error_message ? { error_message: b.error_message as string } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Health Score Calculation (#1050)
// ---------------------------------------------------------------------------

interface DeviceStats {
  device_id: string;
  total_syncs: number;
  success_count: number;
  failure_count: number;
  partial_count: number;
  error_rate: number;
  avg_duration_ms: number;
  max_duration_ms: number;
  min_duration_ms: number;
  avg_record_count: number;
  last_sync_at: string;
  last_sync_status: string;
  top_error_codes: { code: string; count: number }[];
}

interface HealthAnalysis {
  health_score: number;
  health_rating: 'excellent' | 'good' | 'fair' | 'poor';
  overall_stats: {
    total_syncs: number;
    success_rate: number;
    error_rate: number;
    partial_rate: number;
    avg_duration_ms: number;
    max_duration_ms: number;
    total_records_synced: number;
    unique_devices: number;
    analysis_window_days: number;
  };
  devices: DeviceStats[];
  conflict_resolution: {
    total_partial_syncs: number;
    partial_rate: number;
  };
  recommendations: string[];
  generated_at: string;
}

/**
 * Compute a health score (0-100) based on sync metrics.
 *
 * Weighted factors:
 *   - Success rate: 40% weight
 *   - Average duration: 20% weight (< 5s = perfect, > 30s = 0)
 *   - Recent activity: 20% weight (synced in last 24h = perfect)
 *   - Error diversity: 20% weight (fewer unique error codes = better)
 */
function computeHealthScore(
  successRate: number,
  avgDurationMs: number,
  lastSyncAgeHours: number,
  uniqueErrorCodes: number,
): number {
  // Success rate component (0-40)
  const successScore = successRate * 40;

  // Duration component (0-20): < 5s = 20, > 30s = 0
  const durationScore = Math.max(0, Math.min(20, 20 - ((avgDurationMs - 5000) / 25000) * 20));

  // Recency component (0-20): synced < 24h ago = 20, > 7d = 0
  const recencyScore = Math.max(0, Math.min(20, 20 - (lastSyncAgeHours / (7 * 24)) * 20));

  // Error diversity component (0-20): 0 unique errors = 20, 5+ = 0
  const errorScore = Math.max(0, 20 - uniqueErrorCodes * 4);

  return Math.round(successScore + durationScore + recencyScore + errorScore);
}

function getHealthRating(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= HEALTH_EXCELLENT) return 'excellent';
  if (score >= HEALTH_GOOD) return 'good';
  if (score >= HEALTH_FAIR) return 'fair';
  return 'poor';
}

function generateRecommendations(
  analysis: Omit<HealthAnalysis, 'recommendations' | 'generated_at'>,
): string[] {
  const recommendations: string[] = [];

  if (analysis.overall_stats.error_rate > 0.1) {
    recommendations.push(
      'High error rate detected. Check network connectivity and ensure the app is up to date.',
    );
  }

  if (analysis.overall_stats.avg_duration_ms > 15000) {
    recommendations.push(
      'Sync operations are taking longer than expected. Consider reducing the number of offline changes before syncing.',
    );
  }

  if (analysis.overall_stats.avg_duration_ms > 30000) {
    recommendations.push(
      'Critical: Very slow sync times detected. This may indicate network issues or excessive data volume.',
    );
  }

  if (analysis.conflict_resolution.partial_rate > 0.05) {
    recommendations.push(
      'Partial syncs are occurring frequently. Ensure only one device edits the same records simultaneously.',
    );
  }

  if (analysis.overall_stats.unique_devices === 0) {
    recommendations.push(
      'No sync activity detected in the analysis window. Ensure sync is enabled on your devices.',
    );
  }

  for (const device of analysis.devices) {
    if (device.error_rate > 0.3) {
      recommendations.push(
        `Device "${device.device_id.substring(0, 8)}..." has a high failure rate. Consider re-installing or clearing app cache.`,
      );
    }
    const lastSyncAge = Date.now() - new Date(device.last_sync_at).getTime();
    if (lastSyncAge > 3 * 24 * 60 * 60 * 1000) {
      recommendations.push(
        `Device "${device.device_id.substring(0, 8)}..." hasn't synced in over 3 days.`,
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('All sync metrics look healthy. No action needed.');
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// GET Handler: Sync Health Analysis (#1050)
// ---------------------------------------------------------------------------

async function handleGetAnalysis(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createAdminClient>,
  logger: ReturnType<typeof import('../_shared/logger.ts').createLogger>,
): Promise<Response> {
  const url = new URL(req.url);
  const windowDays = Math.min(
    MAX_WINDOW_DAYS,
    Math.max(
      1,
      parseInt(url.searchParams.get('window_days') ?? String(DEFAULT_WINDOW_DAYS), 10) ||
        DEFAULT_WINDOW_DAYS,
    ),
  );

  const sinceDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

  // Fetch all sync logs for this user in the window
  const { data: logs, error: logsError } = await supabase
    .from('sync_health_logs')
    .select('device_id, sync_duration_ms, record_count, error_code, sync_status, created_at')
    .eq('user_id', userId)
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (logsError) {
    logger.error('Failed to fetch sync health logs', { errorMessage: logsError.message });
    return internalErrorResponse(req);
  }

  const allLogs = (logs ?? []) as {
    device_id: string;
    sync_duration_ms: number;
    record_count: number;
    error_code: string | null;
    sync_status: string;
    created_at: string;
  }[];

  // -----------------------------------------------------------------------
  // Compute per-device statistics
  // -----------------------------------------------------------------------
  const deviceMap = new Map<string, typeof allLogs>();
  for (const log of allLogs) {
    const existing = deviceMap.get(log.device_id) ?? [];
    existing.push(log);
    deviceMap.set(log.device_id, existing);
  }

  const devices: DeviceStats[] = [];
  for (const [deviceId, deviceLogs] of deviceMap) {
    const total = deviceLogs.length;
    const successCount = deviceLogs.filter((l) => l.sync_status === 'success').length;
    const failureCount = deviceLogs.filter((l) => l.sync_status === 'failure').length;
    const partialCount = deviceLogs.filter((l) => l.sync_status === 'partial').length;
    const durations = deviceLogs.map((l) => l.sync_duration_ms);
    const records = deviceLogs.map((l) => l.record_count);

    // Aggregate error codes
    const errorCodeCounts = new Map<string, number>();
    for (const log of deviceLogs) {
      if (log.error_code) {
        errorCodeCounts.set(log.error_code, (errorCodeCounts.get(log.error_code) ?? 0) + 1);
      }
    }
    const topErrorCodes = Array.from(errorCodeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    devices.push({
      device_id: deviceId,
      total_syncs: total,
      success_count: successCount,
      failure_count: failureCount,
      partial_count: partialCount,
      error_rate: total > 0 ? parseFloat((failureCount / total).toFixed(4)) : 0,
      avg_duration_ms: total > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / total) : 0,
      max_duration_ms: durations.length > 0 ? Math.max(...durations) : 0,
      min_duration_ms: durations.length > 0 ? Math.min(...durations) : 0,
      avg_record_count: total > 0 ? Math.round(records.reduce((a, b) => a + b, 0) / total) : 0,
      last_sync_at: deviceLogs[0]?.created_at ?? '',
      last_sync_status: deviceLogs[0]?.sync_status ?? 'unknown',
      top_error_codes: topErrorCodes,
    });
  }

  // -----------------------------------------------------------------------
  // Compute overall statistics
  // -----------------------------------------------------------------------
  const totalSyncs = allLogs.length;
  const totalSuccess = allLogs.filter((l) => l.sync_status === 'success').length;
  const totalFailure = allLogs.filter((l) => l.sync_status === 'failure').length;
  const totalPartial = allLogs.filter((l) => l.sync_status === 'partial').length;
  const allDurations = allLogs.map((l) => l.sync_duration_ms);
  const avgDuration =
    totalSyncs > 0 ? Math.round(allDurations.reduce((a, b) => a + b, 0) / totalSyncs) : 0;
  const maxDuration = allDurations.length > 0 ? Math.max(...allDurations) : 0;
  const totalRecordsSynced = allLogs.reduce((sum, l) => sum + l.record_count, 0);

  const uniqueErrorCodes = new Set(allLogs.map((l) => l.error_code).filter(Boolean)).size;

  const lastSyncAt = allLogs[0]?.created_at;
  const lastSyncAgeHours = lastSyncAt
    ? (Date.now() - new Date(lastSyncAt).getTime()) / (60 * 60 * 1000)
    : 999;

  const successRate = totalSyncs > 0 ? totalSuccess / totalSyncs : 0;

  // -----------------------------------------------------------------------
  // Compute health score
  // -----------------------------------------------------------------------
  const healthScore =
    totalSyncs > 0
      ? computeHealthScore(successRate, avgDuration, lastSyncAgeHours, uniqueErrorCodes)
      : 0;

  const analysis: Omit<HealthAnalysis, 'recommendations' | 'generated_at'> = {
    health_score: healthScore,
    health_rating: getHealthRating(healthScore),
    overall_stats: {
      total_syncs: totalSyncs,
      success_rate: parseFloat(successRate.toFixed(4)),
      error_rate: totalSyncs > 0 ? parseFloat((totalFailure / totalSyncs).toFixed(4)) : 0,
      partial_rate: totalSyncs > 0 ? parseFloat((totalPartial / totalSyncs).toFixed(4)) : 0,
      avg_duration_ms: avgDuration,
      max_duration_ms: maxDuration,
      total_records_synced: totalRecordsSynced,
      unique_devices: devices.length,
      analysis_window_days: windowDays,
    },
    devices,
    conflict_resolution: {
      total_partial_syncs: totalPartial,
      partial_rate: totalSyncs > 0 ? parseFloat((totalPartial / totalSyncs).toFixed(4)) : 0,
    },
  };

  const recommendations = generateRecommendations(analysis);

  const fullAnalysis: HealthAnalysis = {
    ...analysis,
    recommendations,
    generated_at: new Date().toISOString(),
  };

  logger.info('Sync health analysis generated', {
    httpStatus: 200,
    healthScore,
    totalSyncs,
    uniqueDevices: devices.length,
  });

  return jsonResponse(req, fullAnalysis as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// POST Handler: Record sync health report
// ---------------------------------------------------------------------------

async function handlePostReport(
  req: Request,
  userId: string,
  supabase: ReturnType<typeof createAdminClient>,
  logger: ReturnType<typeof import('../_shared/logger.ts').createLogger>,
): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, 'Invalid JSON in request body', 400);
  }

  const validation = validateBody(body);
  if ('error' in validation) {
    logger.warn('Validation failed', { validationError: validation.error });
    return errorResponse(req, validation.error, 400);
  }

  const { report } = validation;

  const sanitizedErrorMessage = report.error_message
    ? sanitizeErrorMessage(report.error_message)
    : null;

  const { data: inserted, error: insertError } = await supabase
    .from('sync_health_logs')
    .insert({
      user_id: userId,
      device_id: report.device_id,
      sync_duration_ms: report.sync_duration_ms,
      record_count: report.record_count,
      error_code: report.error_code ?? null,
      error_message: sanitizedErrorMessage,
      sync_status: report.sync_status,
    })
    .select('id, created_at')
    .single();

  if (insertError) {
    logger.error('Failed to insert sync health log', {
      errorMessage: insertError.message,
    });
    return internalErrorResponse(req);
  }

  logger.info('Sync health report recorded', {
    httpStatus: 201,
    syncStatus: report.sync_status,
    syncDurationMs: report.sync_duration_ms,
    recordCount: report.record_count,
    hasErrorCode: !!report.error_code,
    logId: inserted.id,
  });

  return createdResponse(req, {
    id: inserted.id,
    created_at: inserted.created_at,
  });
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const logger = createLogger('sync-health-report');
  logger.info('Request received', { method: req.method });

  // Validate required environment variables (#616)
  const envError = validateEnv('sync-health-report', req);
  if (envError) return envError;

  // POST or GET only
  if (req.method !== 'POST' && req.method !== 'GET') {
    return methodNotAllowedResponse(req);
  }

  try {
    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------
    let user;
    try {
      user = await requireAuth(req);
    } catch (response) {
      return response as Response;
    }

    logger.setUserId(user.id);

    const supabase = createAdminClient();

    // ------------------------------------------------------------------
    // Rate limiting (#272): standardised via shared checkRateLimit()
    // ------------------------------------------------------------------
    const rateLimitResult = await checkRateLimit(
      supabase,
      user.id,
      RATE_LIMITS['sync-health-report'],
    );
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { httpStatus: 429 });
      return rateLimitResponse(req, rateLimitResult, RATE_LIMITS['sync-health-report']);
    }

    // ------------------------------------------------------------------
    // Route by method
    // ------------------------------------------------------------------
    if (req.method === 'GET') {
      return handleGetAnalysis(req, user.id, supabase, logger);
    }

    // POST — record sync health report
    return handlePostReport(req, user.id, supabase, logger);
  } catch (err) {
    logger.error('Sync health report error', {
      errorMessage: (err as Error).message,
    });
    return internalErrorResponse(req);
  }
});
