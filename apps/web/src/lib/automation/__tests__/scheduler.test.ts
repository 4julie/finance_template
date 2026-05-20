// SPDX-License-Identifier: BUSL-1.1

import { describe, it, expect } from 'vitest';

import { calculateNextRun, isOverdue, getOverdueRules } from '../scheduler';

import type { ScheduleConfig, ScheduledRule } from '../scheduler';
import type { Rule } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRule(id: string): Rule {
  return {
    id,
    name: `Rule ${id}`,
    enabled: true,
    trigger: 'scheduled',
    priority: 100,
    condition: { type: 'amount', operator: 'greater_or_equal', valueCents: 1 },
    actions: [{ type: 'add_tag', tag: 'scheduled' }],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

function makeScheduled(schedule: ScheduleConfig, lastRunAt: string | null = null): ScheduledRule {
  return { rule: makeRule('sr-1'), schedule, lastRunAt };
}

// ---------------------------------------------------------------------------
// calculateNextRun — daily
// ---------------------------------------------------------------------------

describe('calculateNextRun — daily', () => {
  it('returns today at the scheduled hour when in the future', () => {
    const anchor = new Date('2025-03-15T06:00:00');
    const schedule: ScheduleConfig = { frequency: 'daily', hour: 10 };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(15);
    expect(next.getHours()).toBe(10);
  });

  it('advances to the next day when the time has passed', () => {
    const anchor = new Date('2025-03-15T12:00:00');
    const schedule: ScheduleConfig = { frequency: 'daily', hour: 10 };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getDate()).toBe(16);
    expect(next.getHours()).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// calculateNextRun — weekly
// ---------------------------------------------------------------------------

describe('calculateNextRun — weekly', () => {
  it('returns this week when the target day is ahead', () => {
    // March 15, 2025 is a Saturday (day 6)
    const anchor = new Date('2025-03-15T06:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      hour: 9,
    };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getDay()).toBe(1); // Monday
    expect(next.getDate()).toBe(17); // March 17
  });

  it('advances to next week when the target day has passed', () => {
    // March 15, 2025 is a Saturday (day 6)
    const anchor = new Date('2025-03-15T12:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'weekly',
      dayOfWeek: 5, // Friday
      hour: 9,
    };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getDay()).toBe(5);
    expect(next.getDate()).toBe(21); // Next Friday, March 21
  });
});

// ---------------------------------------------------------------------------
// calculateNextRun — monthly
// ---------------------------------------------------------------------------

describe('calculateNextRun — monthly', () => {
  it('returns this month when the target day is ahead', () => {
    const anchor = new Date('2025-03-10T06:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'monthly',
      dayOfMonth: 15,
      hour: 8,
    };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getMonth()).toBe(2); // March
    expect(next.getDate()).toBe(15);
  });

  it('advances to next month when the target day has passed', () => {
    const anchor = new Date('2025-03-20T06:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'monthly',
      dayOfMonth: 15,
    };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getMonth()).toBe(3); // April
    expect(next.getDate()).toBe(15);
  });

  it('clamps day to end of month for short months', () => {
    const anchor = new Date('2025-02-01T06:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'monthly',
      dayOfMonth: 31,
    };
    const next = calculateNextRun(schedule, anchor);

    // February 2025 has 28 days
    expect(next.getMonth()).toBe(1); // Feb
    expect(next.getDate()).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// calculateNextRun — yearly
// ---------------------------------------------------------------------------

describe('calculateNextRun — yearly', () => {
  it('returns this year when the target month/day is ahead', () => {
    const anchor = new Date('2025-01-15T06:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'yearly',
      month: 5, // June
      dayOfMonth: 1,
    };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getFullYear()).toBe(2025);
    expect(next.getMonth()).toBe(5);
    expect(next.getDate()).toBe(1);
  });

  it('advances to next year when the target date has passed', () => {
    const anchor = new Date('2025-07-01T06:00:00');
    const schedule: ScheduleConfig = {
      frequency: 'yearly',
      month: 5, // June
      dayOfMonth: 1,
    };
    const next = calculateNextRun(schedule, anchor);

    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------

describe('isOverdue', () => {
  it('returns true when the rule has never run (lastRunAt is null)', () => {
    const scheduled = makeScheduled({ frequency: 'daily', hour: 8 }, null);
    const ref = new Date('2025-03-15T12:00:00');
    expect(isOverdue(scheduled, ref)).toBe(true);
  });

  it('returns true when the next run is in the past', () => {
    const scheduled = makeScheduled({ frequency: 'daily', hour: 8 }, '2025-03-14T08:00:00');
    const ref = new Date('2025-03-15T12:00:00');
    expect(isOverdue(scheduled, ref)).toBe(true);
  });

  it('returns false when the next run is in the future', () => {
    const scheduled = makeScheduled({ frequency: 'daily', hour: 20 }, '2025-03-15T08:00:00');
    const ref = new Date('2025-03-15T12:00:00');
    expect(isOverdue(scheduled, ref)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getOverdueRules
// ---------------------------------------------------------------------------

describe('getOverdueRules', () => {
  it('filters to only overdue rules', () => {
    const ref = new Date('2025-03-15T12:00:00');

    const overdue = makeScheduled({ frequency: 'daily', hour: 8 }, '2025-03-14T08:00:00');
    const notOverdue = makeScheduled({ frequency: 'daily', hour: 20 }, '2025-03-15T08:00:00');

    const result = getOverdueRules([overdue, notOverdue], ref);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(overdue);
  });
});
