// SPDX-License-Identifier: BUSL-1.1

/**
 * Barrel export for the savings & goals suite.
 *
 * References: issues #1590, #1630, #1640, #1650, #1676, #1788
 */

export type {
  SafeToSpendInput,
  SafeToSpendResult,
  WarningLevel,
  RoundUpConfig,
  RoundUpTarget,
  RoundUpTransaction,
  RoundUpResult,
  ChallengeType,
  ChallengeWeek,
  CustomChallengeConfig,
  ChallengeProgress,
  NoSpendResult,
  EmergencyRunwayInput,
  EmergencyRunwayResult,
  RunwayStatus,
  DebtPaydownGoal,
  DebtPaydownResult,
  ExtraPaymentImpact,
  SavingsGoal,
  GoalStatus,
  GoalProjection,
  Milestone,
} from './types';

export { calculateSafeToSpend, recalculateAfterSpending, getWarningLevel } from './safe-to-spend';
export { calculateSingleRoundUp, calculateRoundUpSavings } from './round-up';
export {
  generate52WeekSchedule,
  calculate52WeekTarget,
  generateCustomSchedule,
  calculateCustomTarget,
  calculateChallengeProgress,
  calculateNoSpend,
} from './savings-challenges';
export { calculateEmergencyRunway, getRunwayStatus } from './emergency-runway';
export { calculateDebtPaydown, calculateExtraPaymentImpact } from './debt-paydown-goals';
export { projectGoal, calculateMilestones, getGoalStatus } from './goal-projections';
