// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import {
  calculate52WeekTarget,
  calculateChallengeProgress,
  calculateCustomTarget,
  calculateNoSpend,
  generate52WeekSchedule,
  generateCustomSchedule,
} from './savings-challenges';

describe('savings-challenges', () => {
  describe('generate52WeekSchedule', () => {
    it('generates 52 weeks with escalating amounts', () => {
      const schedule = generate52WeekSchedule(100); // $1 base
      expect(schedule).toHaveLength(52);
      expect(schedule[0].amountCents).toBe(100); // week 1
      expect(schedule[51].amountCents).toBe(5200); // week 52
    });

    it('marks completed weeks', () => {
      const completed = new Set([1, 2, 3]);
      const schedule = generate52WeekSchedule(100, completed);

      expect(schedule[0].completed).toBe(true);
      expect(schedule[1].completed).toBe(true);
      expect(schedule[2].completed).toBe(true);
      expect(schedule[3].completed).toBe(false);
    });
  });

  describe('calculate52WeekTarget', () => {
    it('calculates sum of 1+2+…+52 units', () => {
      // 52 × 53 / 2 = 1378
      expect(calculate52WeekTarget(100)).toBe(137_800); // $1,378
    });

    it('scales with base amount', () => {
      expect(calculate52WeekTarget(200)).toBe(275_600);
    });
  });

  describe('generateCustomSchedule', () => {
    it('generates custom schedule with increment', () => {
      const schedule = generateCustomSchedule({
        totalPeriods: 4,
        startAmountCents: 500,
        incrementCents: 100,
      });

      expect(schedule).toHaveLength(4);
      expect(schedule[0].amountCents).toBe(500);
      expect(schedule[1].amountCents).toBe(600);
      expect(schedule[2].amountCents).toBe(700);
      expect(schedule[3].amountCents).toBe(800);
    });

    it('generates flat schedule with zero increment', () => {
      const schedule = generateCustomSchedule({
        totalPeriods: 3,
        startAmountCents: 1000,
        incrementCents: 0,
      });

      expect(schedule.every((s) => s.amountCents === 1000)).toBe(true);
    });
  });

  describe('calculateCustomTarget', () => {
    it('calculates total for custom challenge', () => {
      // 500 + 600 + 700 + 800 = 2600
      const target = calculateCustomTarget({
        totalPeriods: 4,
        startAmountCents: 500,
        incrementCents: 100,
      });
      expect(target).toBe(2600);
    });
  });

  describe('calculateChallengeProgress', () => {
    it('calculates progress for partially completed challenge', () => {
      const schedule = generate52WeekSchedule(100, new Set([1, 2, 3]));
      const progress = calculateChallengeProgress('52_week', schedule);

      expect(progress.completedPeriods).toBe(3);
      expect(progress.totalPeriods).toBe(52);
      expect(progress.savedCents).toBe(600); // 100 + 200 + 300
      expect(progress.targetCents).toBe(137_800);
      expect(progress.currentStreak).toBe(0); // weeks 4-52 not done, streak broke
      expect(progress.longestStreak).toBe(3);
    });

    it('tracks consecutive streaks correctly', () => {
      const schedule = generate52WeekSchedule(100, new Set([1, 2, 5, 6, 7, 8]));
      const progress = calculateChallengeProgress('52_week', schedule);

      expect(progress.completedPeriods).toBe(6);
      expect(progress.longestStreak).toBe(4); // weeks 5-8
      expect(progress.currentStreak).toBe(0); // week 9+ not done
    });

    it('returns 0 progress for empty schedule', () => {
      const progress = calculateChallengeProgress('custom', []);
      expect(progress.progressPercent).toBe(0);
      expect(progress.savedCents).toBe(0);
    });

    it('calculates 100% for fully completed challenge', () => {
      const allWeeks = new Set(Array.from({ length: 52 }, (_, i) => i + 1));
      const schedule = generate52WeekSchedule(100, allWeeks);
      const progress = calculateChallengeProgress('52_week', schedule);

      expect(progress.progressPercent).toBe(100);
      expect(progress.savedCents).toBe(137_800);
      expect(progress.currentStreak).toBe(52);
      expect(progress.longestStreak).toBe(52);
    });
  });

  describe('calculateNoSpend', () => {
    it('calculates no-spend days and streaks', () => {
      // true = spent money, false = no-spend day
      const result = calculateNoSpend([false, false, false, true, false, false, true]);

      expect(result.noSpendDays).toBe(5);
      expect(result.totalDays).toBe(7);
      expect(result.noSpendPercent).toBe(71); // 5/7 ≈ 71.4%
      expect(result.currentStreak).toBe(0); // last day had spending
      expect(result.longestStreak).toBe(3); // first 3 days
    });

    it('returns all zeros for empty array', () => {
      const result = calculateNoSpend([]);
      expect(result.noSpendDays).toBe(0);
      expect(result.totalDays).toBe(0);
      expect(result.noSpendPercent).toBe(0);
    });

    it('tracks current streak at end', () => {
      const result = calculateNoSpend([true, false, false, false]);

      expect(result.currentStreak).toBe(3);
      expect(result.longestStreak).toBe(3);
    });

    it('handles all no-spend days', () => {
      const result = calculateNoSpend([false, false, false, false, false]);

      expect(result.noSpendDays).toBe(5);
      expect(result.noSpendPercent).toBe(100);
      expect(result.currentStreak).toBe(5);
    });

    it('handles all spend days', () => {
      const result = calculateNoSpend([true, true, true]);

      expect(result.noSpendDays).toBe(0);
      expect(result.noSpendPercent).toBe(0);
      expect(result.currentStreak).toBe(0);
      expect(result.longestStreak).toBe(0);
    });
  });
});
