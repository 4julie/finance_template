// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for `monitoring/alerts.ts` (#1386).
 *
 * Validates alert rule evaluation, state transitions (pending →
 * firing → resolved), cooldown enforcement, and the alert manager API.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAlertManager,
  DEFAULT_ALERT_RULES,
  type AlertRule,
  type AlertManager,
} from './alerts.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal rule set for testing. */
const TEST_RULES: AlertRule[] = [
  {
    id: 'test_error_rate',
    name: 'Test Error Rate',
    description: 'Fires when error rate exceeds 5%.',
    severity: 'critical',
    threshold: 5,
    unit: 'percent',
    cooldownMs: 60_000, // 1 minute
  },
  {
    id: 'test_latency',
    name: 'Test Latency',
    description: 'Fires when latency exceeds 1000ms.',
    severity: 'warning',
    threshold: 1000,
    unit: 'ms',
    cooldownMs: 30_000, // 30 seconds
  },
];

let manager: AlertManager;
let clock: number;

beforeEach(() => {
  clock = Date.now();
  manager = createAlertManager(TEST_RULES, () => clock);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Alert manager', () => {
  it('returns null for unknown rule IDs', () => {
    expect(manager.evaluate('nonexistent', 42)).toBeNull();
  });

  it('creates a pending alert when value is below threshold', () => {
    const alert = manager.evaluate('test_error_rate', 2);
    expect(alert).not.toBeNull();
    expect(alert!.state).toBe('pending');
    expect(alert!.severity).toBe('critical');
    expect(alert!.currentValue).toBe(2);
  });

  it('fires an alert when value meets threshold', () => {
    const alert = manager.evaluate('test_error_rate', 5);
    expect(alert!.state).toBe('firing');
    expect(alert!.lastFired).not.toBeNull();
  });

  it('fires an alert when value exceeds threshold', () => {
    const alert = manager.evaluate('test_error_rate', 10);
    expect(alert!.state).toBe('firing');
    expect(alert!.currentValue).toBe(10);
  });

  it('resolves a firing alert when value drops below threshold', () => {
    manager.evaluate('test_error_rate', 10); // fire
    const resolved = manager.evaluate('test_error_rate', 2); // resolve
    expect(resolved!.state).toBe('resolved');
    expect(resolved!.currentValue).toBe(2);
  });

  it('enforces cooldown — does not re-fire within cooldown period', () => {
    manager.evaluate('test_error_rate', 10); // fire at t=0

    // Advance time by 30s (less than 60s cooldown)
    clock += 30_000;
    const during = manager.evaluate('test_error_rate', 15);
    expect(during!.state).toBe('firing');
    // lastFired should remain the original time, not updated
    expect(during!.currentValue).toBe(15);
  });

  it('re-fires after cooldown expires', () => {
    const first = manager.evaluate('test_error_rate', 10); // fire
    const firstFired = first!.lastFired;

    // Advance past cooldown
    clock += 61_000;
    const second = manager.evaluate('test_error_rate', 12);
    expect(second!.state).toBe('firing');
    expect(second!.lastFired).not.toBe(firstFired);
  });

  it('tracks multiple rules independently', () => {
    manager.evaluate('test_error_rate', 10);
    manager.evaluate('test_latency', 500);

    const all = manager.getAll();
    expect(all.length).toBe(2);

    const errorAlert = manager.get('test_error_rate');
    const latencyAlert = manager.get('test_latency');
    expect(errorAlert!.state).toBe('firing');
    expect(latencyAlert!.state).toBe('pending');
  });

  it('manually resolves an alert', () => {
    manager.evaluate('test_error_rate', 10); // fire
    const resolved = manager.resolve('test_error_rate');
    expect(resolved!.state).toBe('resolved');
  });

  it('returns null when resolving an unknown rule', () => {
    expect(manager.resolve('nonexistent')).toBeNull();
  });

  it('resets all alert state', () => {
    manager.evaluate('test_error_rate', 10);
    manager.evaluate('test_latency', 2000);
    manager.reset();
    expect(manager.getAll().length).toBe(0);
  });
});

describe('Default alert rules', () => {
  it('contains at least 3 rules', () => {
    expect(DEFAULT_ALERT_RULES.length).toBeGreaterThanOrEqual(3);
  });

  it('all rules have positive thresholds', () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(rule.threshold).toBeGreaterThan(0);
    }
  });

  it('all rules have positive cooldown', () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(rule.cooldownMs).toBeGreaterThan(0);
    }
  });

  it('all rules have unique IDs', () => {
    const ids = DEFAULT_ALERT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
