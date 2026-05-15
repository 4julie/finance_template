// SPDX-License-Identifier: BUSL-1.1

/**
 * Tests for `monitoring/uptime-kuma-config.ts` (#1328).
 *
 * Validates configuration structure, default values, threshold
 * boundary checks, and the validation function.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  DEFAULT_THRESHOLDS,
  DEFAULT_MONITORS,
  DEFAULT_NOTIFICATIONS,
  validateConfig,
  type UptimeKumaConfig,
} from './uptime-kuma-config.js';

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

describe('Default configuration', () => {
  it('has at least one monitor', () => {
    expect(DEFAULT_MONITORS.length).toBeGreaterThan(0);
  });

  it('all monitors have required fields', () => {
    for (const m of DEFAULT_MONITORS) {
      expect(m.id).toBeTruthy();
      expect(m.name).toBeTruthy();
      expect(m.url).toBeTruthy();
      expect(m.intervalSeconds).toBeGreaterThan(0);
      expect(m.timeoutMs).toBeGreaterThan(0);
      expect(m.retries).toBeGreaterThanOrEqual(0);
    }
  });

  it('all monitors have unique IDs', () => {
    const ids = DEFAULT_MONITORS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has at least one notification channel', () => {
    expect(DEFAULT_NOTIFICATIONS.length).toBeGreaterThan(0);
  });

  it('notification channels use env var references (no secrets)', () => {
    for (const n of DEFAULT_NOTIFICATIONS) {
      const configValues = Object.values(n.config);
      for (const v of configValues) {
        // Values should be env var names or channel names, not secrets
        expect(v).not.toMatch(/^sk_|^pk_|^xoxb-/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Threshold values
// ---------------------------------------------------------------------------

describe('Alert thresholds', () => {
  it('maxResponseTimeMs is 2000ms', () => {
    expect(DEFAULT_THRESHOLDS.maxResponseTimeMs).toBe(2000);
  });

  it('maxErrorRatePercent is 1%', () => {
    expect(DEFAULT_THRESHOLDS.maxErrorRatePercent).toBe(1);
  });

  it('maxDowntimeSeconds is 30s', () => {
    expect(DEFAULT_THRESHOLDS.maxDowntimeSeconds).toBe(30);
  });

  it('all thresholds are positive', () => {
    expect(DEFAULT_THRESHOLDS.maxResponseTimeMs).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.maxErrorRatePercent).toBeGreaterThan(0);
    expect(DEFAULT_THRESHOLDS.maxDowntimeSeconds).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe('validateConfig()', () => {
  it('returns no errors for the default config', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual([]);
  });

  it('reports error when monitors array is empty', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      monitors: [],
    };
    const errors = validateConfig(cfg);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('monitors');
  });

  it('reports error when monitor has no URL', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      monitors: [{ ...DEFAULT_MONITORS[0], url: '' }],
    };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.field.includes('url'))).toBe(true);
  });

  it('reports error when interval is zero', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      monitors: [{ ...DEFAULT_MONITORS[0], intervalSeconds: 0 }],
    };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.field.includes('intervalSeconds'))).toBe(true);
  });

  it('reports error when timeout is negative', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      monitors: [{ ...DEFAULT_MONITORS[0], timeoutMs: -1 }],
    };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.field.includes('timeoutMs'))).toBe(true);
  });

  it('reports error when maxResponseTimeMs is zero', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      thresholds: { ...DEFAULT_THRESHOLDS, maxResponseTimeMs: 0 },
    };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.field.includes('maxResponseTimeMs'))).toBe(true);
  });

  it('reports error when maxErrorRatePercent is out of range', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      thresholds: { ...DEFAULT_THRESHOLDS, maxErrorRatePercent: 101 },
    };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.field.includes('maxErrorRatePercent'))).toBe(true);
  });

  it('reports error when maxDowntimeSeconds is zero', () => {
    const cfg: UptimeKumaConfig = {
      ...DEFAULT_CONFIG,
      thresholds: { ...DEFAULT_THRESHOLDS, maxDowntimeSeconds: 0 },
    };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.field.includes('maxDowntimeSeconds'))).toBe(true);
  });
});
