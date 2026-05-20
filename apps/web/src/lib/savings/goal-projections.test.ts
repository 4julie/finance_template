// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';

import { calculateMilestones, getGoalStatus, projectGoal } from './goal-projections';
import type { SavingsGoal } from './types';

const fixedDate = new Date('2025-01-01');

const sampleGoal: SavingsGoal = {
  id: 'goal-1',
  name: 'Vacation Fund',
  targetCents: 500_000, // $5,000
  currentCents: 200_000, // $2,000
  monthlyContributionCents: 50_000, // $500/mo
  startDate: '2024-07-01',
  targetDate: '2025-07-01',
};

describe('goal-projections', () => {
  describe('projectGoal', () => {
    it('projects completion date', () => {
      const projection = projectGoal(sampleGoal, fixedDate);

      // $3,000 remaining / $500/mo = 6 months → 2025-07-01
      expect(projection.monthsRemaining).toBe(6);
      expect(projection.completionPercent).toBe(40);
      expect(projection.projectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns completed status when goal is met', () => {
      const completed: SavingsGoal = {
        ...sampleGoal,
        currentCents: 500_000,
      };

      const projection = projectGoal(completed, fixedDate);

      expect(projection.status).toBe('completed');
      expect(projection.completionPercent).toBe(100);
      expect(projection.monthsRemaining).toBe(0);
    });

    it('returns completed status when goal is exceeded', () => {
      const exceeded: SavingsGoal = {
        ...sampleGoal,
        currentCents: 600_000,
      };

      const projection = projectGoal(exceeded, fixedDate);
      expect(projection.status).toBe('completed');
    });

    it('calculates required monthly to hit target date', () => {
      const projection = projectGoal(sampleGoal, fixedDate);

      // Target date is 2025-07-01, now is 2025-01-01, 6 months
      // $3,000 / 6 = $500/mo
      expect(projection.requiredMonthlyCents).toBe(50_000);
    });

    it('handles zero contribution rate', () => {
      const noContrib: SavingsGoal = {
        ...sampleGoal,
        monthlyContributionCents: 0,
      };

      const projection = projectGoal(noContrib, fixedDate);

      expect(projection.monthsRemaining).toBe(-1); // Infinity sentinel
      expect(projection.projectedDate).toBe('9999-12-31');
    });

    it('returns on_track when no target date', () => {
      const noTarget: SavingsGoal = {
        ...sampleGoal,
        targetDate: undefined,
      };

      const projection = projectGoal(noTarget, fixedDate);
      expect(projection.status).toBe('on_track');
      expect(projection.requiredMonthlyCents).toBeNull();
    });

    it('returns behind when projection exceeds target date', () => {
      const behind: SavingsGoal = {
        ...sampleGoal,
        monthlyContributionCents: 10_000, // only $100/mo → 30 months
        targetDate: '2025-07-01', // 6 months away
      };

      const projection = projectGoal(behind, fixedDate);
      expect(projection.status).toBe('behind');
    });

    it('returns ahead when projection is well before target date', () => {
      const ahead: SavingsGoal = {
        ...sampleGoal,
        monthlyContributionCents: 200_000, // $2,000/mo → ~2 months
        targetDate: '2026-01-01', // 12 months away
      };

      const projection = projectGoal(ahead, fixedDate);
      expect(projection.status).toBe('ahead');
    });
  });

  describe('getGoalStatus', () => {
    it('returns completed when current >= target', () => {
      const completed: SavingsGoal = {
        ...sampleGoal,
        currentCents: 500_000,
      };
      expect(getGoalStatus(completed, fixedDate)).toBe('completed');
    });

    it('returns on_track when no target date', () => {
      const noTarget: SavingsGoal = {
        ...sampleGoal,
        targetDate: undefined,
      };
      expect(getGoalStatus(noTarget, fixedDate)).toBe('on_track');
    });
  });

  describe('calculateMilestones', () => {
    it('returns 4 milestones at 25%, 50%, 75%, 100%', () => {
      const milestones = calculateMilestones(sampleGoal, fixedDate);

      expect(milestones).toHaveLength(4);
      expect(milestones.map((m) => m.percent)).toEqual([25, 50, 75, 100]);
    });

    it('marks reached milestones correctly', () => {
      // Current: $2,000 of $5,000 = 40%
      const milestones = calculateMilestones(sampleGoal, fixedDate);

      expect(milestones[0].reached).toBe(true); // 25% = $1,250 ✓
      expect(milestones[1].reached).toBe(false); // 50% = $2,500 > $2,000 current
    });

    it('calculates milestone amounts', () => {
      const milestones = calculateMilestones(sampleGoal, fixedDate);

      expect(milestones[0].amountCents).toBe(125_000); // 25% of $5,000
      expect(milestones[1].amountCents).toBe(250_000); // 50%
      expect(milestones[2].amountCents).toBe(375_000); // 75%
      expect(milestones[3].amountCents).toBe(500_000); // 100%
    });

    it('projects dates for unreached milestones', () => {
      const milestones = calculateMilestones(sampleGoal, fixedDate);

      // 25% reached → null date
      expect(milestones[0].projectedDate).toBeNull();

      // 50% = $2,500, need $500 more at $500/mo = 1 month
      const unreached = milestones.find((m) => !m.reached && m.projectedDate !== null);
      expect(unreached?.projectedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('handles fully completed goal', () => {
      const completed: SavingsGoal = {
        ...sampleGoal,
        currentCents: 600_000,
      };

      const milestones = calculateMilestones(completed, fixedDate);
      expect(milestones.every((m) => m.reached)).toBe(true);
      expect(milestones.every((m) => m.projectedDate === null)).toBe(true);
    });
  });
});
