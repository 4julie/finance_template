// SPDX-License-Identifier: BUSL-1.1

/**
 * Uptime Kuma monitoring configuration for the Finance API (#1328).
 *
 * Defines typed monitoring targets, alert thresholds, and notification
 * channel structures that mirror an Uptime Kuma deployment. The
 * configuration is exported as a plain TypeScript object so it can be
 * consumed by deployment scripts or health-check tooling.
 *
 * **No secrets or connection strings are stored here** — actual
 * credentials are injected at runtime via environment variables.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported monitor types matching Uptime Kuma's monitor kinds. */
export type MonitorType = 'http' | 'tcp' | 'ping' | 'keyword';

/** A single monitoring target. */
export interface MonitorTarget {
  /** Unique identifier for this monitor. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Monitor type. */
  type: MonitorType;
  /** URL or host to monitor. */
  url: string;
  /** Check interval in seconds. */
  intervalSeconds: number;
  /** Number of retries before marking as down. */
  retries: number;
  /** Expected HTTP status code (for HTTP monitors). */
  expectedStatus?: number;
  /** Keyword to search for in the response body (for keyword monitors). */
  keyword?: string;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
}

/** Alert threshold configuration. */
export interface AlertThresholds {
  /** Maximum acceptable response time in milliseconds. */
  maxResponseTimeMs: number;
  /** Maximum acceptable error rate as a percentage (0–100). */
  maxErrorRatePercent: number;
  /** Maximum acceptable downtime in seconds before alerting. */
  maxDowntimeSeconds: number;
}

/** Notification channel types. */
export type NotificationChannelType = 'email' | 'slack' | 'webhook' | 'pushover';

/** Notification channel configuration. */
export interface NotificationChannel {
  /** Unique channel identifier. */
  id: string;
  /** Channel type. */
  type: NotificationChannelType;
  /** Human-readable channel name. */
  name: string;
  /** Whether this channel is enabled. */
  enabled: boolean;
  /**
   * Channel-specific configuration.
   *
   * Actual secrets (API keys, webhook URLs) are injected at runtime
   * via environment variables — this object only holds non-sensitive
   * structural config such as channel names or template references.
   */
  config: Record<string, string>;
}

/** Full Uptime Kuma configuration. */
export interface UptimeKumaConfig {
  monitors: MonitorTarget[];
  thresholds: AlertThresholds;
  notifications: NotificationChannel[];
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

/** Default alert thresholds. */
export const DEFAULT_THRESHOLDS: AlertThresholds = {
  maxResponseTimeMs: 2000,
  maxErrorRatePercent: 1,
  maxDowntimeSeconds: 30,
};

/** Default monitoring targets for the Finance API stack. */
export const DEFAULT_MONITORS: MonitorTarget[] = [
  {
    id: 'api-health',
    name: 'API Health Check',
    type: 'http',
    url: '/functions/v1/health-check',
    intervalSeconds: 30,
    retries: 3,
    expectedStatus: 200,
    timeoutMs: 5000,
  },
  {
    id: 'edge-functions',
    name: 'Edge Functions Runtime',
    type: 'http',
    url: '/functions/v1/main',
    intervalSeconds: 60,
    retries: 2,
    expectedStatus: 200,
    timeoutMs: 10000,
  },
  {
    id: 'database',
    name: 'Database Connectivity',
    type: 'tcp',
    url: 'db:5432',
    intervalSeconds: 30,
    retries: 3,
    timeoutMs: 5000,
  },
  {
    id: 'powersync',
    name: 'PowerSync Endpoint',
    type: 'http',
    url: '/powersync/health',
    intervalSeconds: 60,
    retries: 2,
    expectedStatus: 200,
    timeoutMs: 10000,
  },
];

/** Default notification channels (templates — actual secrets are env vars). */
export const DEFAULT_NOTIFICATIONS: NotificationChannel[] = [
  {
    id: 'ops-email',
    name: 'Operations Email',
    type: 'email',
    enabled: true,
    config: {
      recipientEnvVar: 'ALERT_EMAIL_RECIPIENT',
      smtpHostEnvVar: 'ALERT_SMTP_HOST',
    },
  },
  {
    id: 'ops-slack',
    name: 'Operations Slack',
    type: 'slack',
    enabled: true,
    config: {
      webhookUrlEnvVar: 'ALERT_SLACK_WEBHOOK_URL',
      channel: '#ops-alerts',
    },
  },
];

/** Full default configuration. */
export const DEFAULT_CONFIG: UptimeKumaConfig = {
  monitors: DEFAULT_MONITORS,
  thresholds: DEFAULT_THRESHOLDS,
  notifications: DEFAULT_NOTIFICATIONS,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validation error detail. */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate an Uptime Kuma configuration object.
 *
 * @returns An array of validation errors (empty if valid).
 */
export function validateConfig(config: UptimeKumaConfig): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config.monitors || config.monitors.length === 0) {
    errors.push({ field: 'monitors', message: 'At least one monitor must be defined.' });
  }

  for (const monitor of config.monitors ?? []) {
    if (!monitor.id) {
      errors.push({ field: 'monitors[].id', message: 'Monitor id is required.' });
    }
    if (!monitor.url) {
      errors.push({ field: `monitors[${monitor.id}].url`, message: 'Monitor url is required.' });
    }
    if (monitor.intervalSeconds <= 0) {
      errors.push({
        field: `monitors[${monitor.id}].intervalSeconds`,
        message: 'Interval must be positive.',
      });
    }
    if (monitor.timeoutMs <= 0) {
      errors.push({
        field: `monitors[${monitor.id}].timeoutMs`,
        message: 'Timeout must be positive.',
      });
    }
  }

  if (config.thresholds.maxResponseTimeMs <= 0) {
    errors.push({
      field: 'thresholds.maxResponseTimeMs',
      message: 'Max response time must be positive.',
    });
  }
  if (config.thresholds.maxErrorRatePercent < 0 || config.thresholds.maxErrorRatePercent > 100) {
    errors.push({
      field: 'thresholds.maxErrorRatePercent',
      message: 'Error rate must be between 0 and 100.',
    });
  }
  if (config.thresholds.maxDowntimeSeconds <= 0) {
    errors.push({
      field: 'thresholds.maxDowntimeSeconds',
      message: 'Max downtime must be positive.',
    });
  }

  return errors;
}
