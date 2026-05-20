// SPDX-License-Identifier: BUSL-1.1

/**
 * Scheduled rule types and next-run calculation for the automation engine.
 *
 * Uses a simplified cron-like frequency model (daily / weekly / monthly /
 * yearly) rather than full cron expressions, keeping the logic portable
 * and easy to validate.
 *
 * Reference: issue #1614
 */

import type { Rule } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Simplified schedule frequency. */
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

/** Day of the week (0 = Sunday … 6 = Saturday). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Configuration for a scheduled run cadence. */
export interface ScheduleConfig {
  /** How often the rule runs. */
  readonly frequency: ScheduleFrequency;
  /**
   * Day of the week for `weekly` schedules (0 = Sunday).
   * Ignored for other frequencies.
   */
  readonly dayOfWeek?: DayOfWeek;
  /**
   * Day of the month for `monthly` / `yearly` schedules (1–31).
   * If the month has fewer days, the last day of the month is used.
   * Ignored for other frequencies.
   */
  readonly dayOfMonth?: number;
  /**
   * Month for `yearly` schedules (0 = January … 11 = December).
   * Ignored for other frequencies.
   */
  readonly month?: number;
  /**
   * Hour of the day (0–23) at which the rule should run.
   * @default 0
   */
  readonly hour?: number;
  /**
   * Minute of the hour (0–59) at which the rule should run.
   * @default 0
   */
  readonly minute?: number;
}

/** A rule paired with its scheduling configuration. */
export interface ScheduledRule {
  /** The automation rule to run. */
  readonly rule: Rule;
  /** Schedule cadence. */
  readonly schedule: ScheduleConfig;
  /** ISO 8601 datetime of the last successful run, or `null` if never run. */
  readonly lastRunAt: string | null;
}

// ---------------------------------------------------------------------------
// Next-run calculation
// ---------------------------------------------------------------------------

/**
 * Clamp a day-of-month to the number of days in the given month/year.
 *
 * @param year  - Full year (e.g. 2025).
 * @param month - Month index (0–11).
 * @param day   - Desired day (1–31).
 * @returns The clamped day.
 */
function clampDay(year: number, month: number, day: number): number {
  const maxDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, maxDay);
}

/**
 * Calculate the next run date/time for a scheduled rule.
 *
 * The calculation is based on the schedule configuration and an anchor
 * point (`after`). If no anchor is given, the current time is used.
 *
 * @param schedule - The schedule configuration.
 * @param after    - Calculate the next run after this date (defaults to now).
 * @returns The next run as a `Date` object.
 */
export function calculateNextRun(schedule: ScheduleConfig, after: Date = new Date()): Date {
  const hour = schedule.hour ?? 0;
  const minute = schedule.minute ?? 0;

  switch (schedule.frequency) {
    case 'daily': {
      const next = new Date(after);
      next.setHours(hour, minute, 0, 0);
      if (next <= after) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    case 'weekly': {
      const targetDay = schedule.dayOfWeek ?? 1; // default Monday
      const next = new Date(after);
      next.setHours(hour, minute, 0, 0);

      const currentDay = next.getDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0 && next <= after) {
        daysUntil = 7;
      }
      next.setDate(next.getDate() + daysUntil);
      return next;
    }

    case 'monthly': {
      const targetDom = schedule.dayOfMonth ?? 1;
      const next = new Date(after);
      next.setHours(hour, minute, 0, 0);

      // Try this month first.
      const clampedThisMonth = clampDay(next.getFullYear(), next.getMonth(), targetDom);
      next.setDate(clampedThisMonth);

      if (next <= after) {
        // Move to next month.
        next.setMonth(next.getMonth() + 1);
        const clampedNextMonth = clampDay(next.getFullYear(), next.getMonth(), targetDom);
        next.setDate(clampedNextMonth);
      }

      return next;
    }

    case 'yearly': {
      const targetMonth = schedule.month ?? 0;
      const targetDom = schedule.dayOfMonth ?? 1;
      const next = new Date(after);
      next.setHours(hour, minute, 0, 0);

      // Try this year.
      next.setMonth(targetMonth);
      const clampedThisYear = clampDay(next.getFullYear(), targetMonth, targetDom);
      next.setDate(clampedThisYear);

      if (next <= after) {
        // Move to next year.
        next.setFullYear(next.getFullYear() + 1);
        const clampedNextYear = clampDay(next.getFullYear(), targetMonth, targetDom);
        next.setDate(clampedNextYear);
      }

      return next;
    }

    default: {
      const _exhaustive: never = schedule.frequency;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Overdue detection
// ---------------------------------------------------------------------------

/**
 * Determine whether a scheduled rule is overdue.
 *
 * A rule is overdue when its next expected run (computed from its last run
 * or, if never run, from epoch) is in the past relative to `referenceDate`.
 *
 * @param scheduled     - The scheduled rule to check.
 * @param referenceDate - The point in time to compare against (defaults to now).
 * @returns `true` when the rule should have already run.
 */
export function isOverdue(scheduled: ScheduledRule, referenceDate: Date = new Date()): boolean {
  const anchor = scheduled.lastRunAt ? new Date(scheduled.lastRunAt) : new Date(0); // epoch — never run ⇒ always overdue

  const nextRun = calculateNextRun(scheduled.schedule, anchor);
  return nextRun <= referenceDate;
}

/**
 * Filter a list of scheduled rules and return only those that are overdue.
 *
 * @param scheduledRules - The scheduled rules to check.
 * @param referenceDate  - The point in time to compare against (defaults to now).
 * @returns The subset of rules that are overdue.
 */
export function getOverdueRules(
  scheduledRules: readonly ScheduledRule[],
  referenceDate: Date = new Date(),
): ScheduledRule[] {
  return scheduledRules.filter((sr) => isOverdue(sr, referenceDate));
}
