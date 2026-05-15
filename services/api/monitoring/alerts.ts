// SPDX-License-Identifier: BUSL-1.1

/**
 * Alerting rules and state machine for the Finance API (#1386).
 *
 * Defines alert rules (error-rate spikes, slow queries, sync failures),
 * severity levels, and a state machine that prevents alert storms via
 * configurable cooldown periods.
 *
 * **No PII or financial data is ever included in alert payloads.**
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Alert severity — determines notification urgency. */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Alert lifecycle state. */
export type AlertState = 'pending' | 'firing' | 'resolved';

/** Definition of a single alert rule. */
export interface AlertRule {
  /** Unique rule identifier (e.g. `error_rate_spike`). */
  id: string;
  /** Human-readable rule name. */
  name: string;
  /** Description of what the rule monitors. */
  description: string;
  /** Severity when the rule fires. */
  severity: AlertSeverity;
  /** Threshold value that triggers the alert. */
  threshold: number;
  /** Unit for the threshold (e.g. `percent`, `ms`, `count`). */
  unit: string;
  /**
   * Cooldown period in milliseconds — after an alert fires, it will
   * not re-fire until the cooldown expires. Prevents alert storms.
   */
  cooldownMs: number;
}

/** Runtime state for a single alert instance. */
export interface AlertInstance {
  ruleId: string;
  state: AlertState;
  severity: AlertSeverity;
  /** ISO 8601 timestamp when the alert last transitioned. */
  lastTransition: string;
  /** ISO 8601 timestamp when the alert last fired (for cooldown). */
  lastFired: string | null;
  /** Current metric value that triggered or resolved the alert. */
  currentValue: number;
}

// ---------------------------------------------------------------------------
// Default alert rules
// ---------------------------------------------------------------------------

/**
 * Built-in alert rules covering the critical operational signals.
 *
 * Each rule has a sensible default threshold and cooldown.
 */
export const DEFAULT_ALERT_RULES: readonly AlertRule[] = [
  {
    id: 'error_rate_spike',
    name: 'Error Rate Spike',
    description: 'Fires when the error rate exceeds the threshold percentage.',
    severity: 'critical',
    threshold: 5, // percent
    unit: 'percent',
    cooldownMs: 5 * 60 * 1000, // 5 minutes
  },
  {
    id: 'slow_query',
    name: 'Slow Query',
    description: 'Fires when average query response time exceeds the threshold.',
    severity: 'warning',
    threshold: 2000, // ms
    unit: 'ms',
    cooldownMs: 10 * 60 * 1000, // 10 minutes
  },
  {
    id: 'sync_failure',
    name: 'Sync Failure',
    description: 'Fires when the number of sync conflicts exceeds the threshold.',
    severity: 'critical',
    threshold: 10, // conflicts
    unit: 'count',
    cooldownMs: 15 * 60 * 1000, // 15 minutes
  },
  {
    id: 'high_latency',
    name: 'High Latency',
    description: 'Fires when p95 response time exceeds the threshold.',
    severity: 'warning',
    threshold: 5000, // ms
    unit: 'ms',
    cooldownMs: 10 * 60 * 1000, // 10 minutes
  },
  {
    id: 'connection_saturation',
    name: 'Connection Saturation',
    description: 'Fires when active connections exceed the threshold.',
    severity: 'warning',
    threshold: 100,
    unit: 'count',
    cooldownMs: 5 * 60 * 1000, // 5 minutes
  },
];

// ---------------------------------------------------------------------------
// Alert manager
// ---------------------------------------------------------------------------

/**
 * Manages alert state transitions and cooldown enforcement.
 *
 * Usage:
 * ```ts
 * const manager = createAlertManager(DEFAULT_ALERT_RULES);
 * const alert = manager.evaluate('error_rate_spike', 7.5);
 * // alert.state === 'firing', alert.severity === 'critical'
 * ```
 */
export interface AlertManager {
  /** Evaluate a rule against a current metric value and return the alert instance. */
  evaluate(ruleId: string, currentValue: number): AlertInstance | null;
  /** Get the current state of all alert instances. */
  getAll(): AlertInstance[];
  /** Get a specific alert instance by rule ID. */
  get(ruleId: string): AlertInstance | null;
  /** Manually resolve an alert. */
  resolve(ruleId: string): AlertInstance | null;
  /** Reset all alert state (useful in tests). */
  reset(): void;
}

/**
 * Create a new alert manager with the given rules.
 *
 * @param rules The alert rules to manage.
 * @param nowFn Optional clock function for testing (defaults to `Date.now`).
 */
export function createAlertManager(
  rules: readonly AlertRule[],
  nowFn: () => number = Date.now,
): AlertManager {
  const ruleMap = new Map<string, AlertRule>();
  const instances = new Map<string, AlertInstance>();

  for (const rule of rules) {
    ruleMap.set(rule.id, rule);
  }

  function evaluate(ruleId: string, currentValue: number): AlertInstance | null {
    const rule = ruleMap.get(ruleId);
    if (!rule) return null;

    const existing = instances.get(ruleId);
    const now = new Date(nowFn()).toISOString();

    // Check if value exceeds threshold
    const isBreaching = currentValue >= rule.threshold;

    if (isBreaching) {
      // Check cooldown — if already fired recently, stay in firing state
      if (existing?.state === 'firing' && existing.lastFired) {
        const lastFiredTime = new Date(existing.lastFired).getTime();
        if (nowFn() - lastFiredTime < rule.cooldownMs) {
          // Still in cooldown — update value but don't re-fire
          const updated: AlertInstance = {
            ...existing,
            currentValue,
          };
          instances.set(ruleId, updated);
          return updated;
        }
      }

      // Fire the alert
      const instance: AlertInstance = {
        ruleId,
        state: 'firing',
        severity: rule.severity,
        lastTransition: now,
        lastFired: now,
        currentValue,
      };
      instances.set(ruleId, instance);
      return instance;
    }

    // Value is below threshold
    if (existing && existing.state !== 'resolved') {
      const resolved: AlertInstance = {
        ruleId,
        state: 'resolved',
        severity: rule.severity,
        lastTransition: now,
        lastFired: existing.lastFired,
        currentValue,
      };
      instances.set(ruleId, resolved);
      return resolved;
    }

    // No existing alert and not breaching — nothing to report
    if (!existing) {
      const pending: AlertInstance = {
        ruleId,
        state: 'pending',
        severity: rule.severity,
        lastTransition: now,
        lastFired: null,
        currentValue,
      };
      instances.set(ruleId, pending);
      return pending;
    }

    return existing;
  }

  function getAll(): AlertInstance[] {
    return Array.from(instances.values());
  }

  function get(ruleId: string): AlertInstance | null {
    return instances.get(ruleId) ?? null;
  }

  function resolveAlert(ruleId: string): AlertInstance | null {
    const existing = instances.get(ruleId);
    if (!existing) return null;

    const resolved: AlertInstance = {
      ...existing,
      state: 'resolved',
      lastTransition: new Date(nowFn()).toISOString(),
    };
    instances.set(ruleId, resolved);
    return resolved;
  }

  function reset(): void {
    instances.clear();
  }

  return { evaluate, getAll, get, resolve: resolveAlert, reset };
}
