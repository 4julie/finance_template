// SPDX-License-Identifier: BUSL-1.1

/**
 * Financial automation rule engine.
 *
 * Barrel exports for the automation library. This module re-exports all
 * public types, condition evaluators, action executors, engine functions,
 * pre-built templates, scheduler utilities, and validation helpers.
 *
 * Reference: issue #1614
 *
 * @module automation
 */

// Types
export type {
  AccountCondition,
  AddTagAction,
  AmountCondition,
  AmountOperator,
  CategorizeAction,
  CategoryCondition,
  CompoundCondition,
  ConflictResolution,
  DateRangeCondition,
  FlagForReviewAction,
  LeafCondition,
  MerchantCondition,
  MoveToBudgetAction,
  PatternMode,
  RecurringCondition,
  Rule,
  RuleAction,
  RuleCondition,
  RuleEvaluationResult,
  RuleExecutionResult,
  RulePriority,
  RuleTrigger,
  SendNotificationAction,
  SplitChild,
  SplitPart,
  SplitTransactionAction,
  Transaction,
  TransactionChanges,
  TransactionMutation,
  ValidationDiagnostic,
  ValidationResult,
  ValidationSeverity,
} from './types';

// Conditions
export {
  evaluateCondition,
  evaluateLeafCondition,
  evaluateCompoundCondition,
  evaluateAmountCondition,
  evaluateCategoryCondition,
  evaluateMerchantCondition,
  evaluateDateRangeCondition,
  evaluateRecurringCondition,
  evaluateAccountCondition,
  matchesPattern,
} from './conditions';

// Actions
export {
  executeAction,
  executeCategorize,
  executeAddTag,
  executeSplitTransaction,
  executeMoveToBudget,
  executeFlagForReview,
  executeSendNotification,
  bankersRound,
} from './actions';

// Engine
export { runEngine, evaluateRule, sortByPriority } from './engine';
export type { EngineOptions } from './engine';

// Templates
export {
  autoCategorizeGroceries,
  flagLargePurchases,
  splitRent5050,
  tagSubscriptionPayments,
  roundUpSavings,
  resetTemplateCounter,
} from './templates';

// Scheduler
export { calculateNextRun, isOverdue, getOverdueRules } from './scheduler';
export type { ScheduleFrequency, DayOfWeek, ScheduleConfig, ScheduledRule } from './scheduler';

// Validation
export {
  validateRule,
  validateRuleSet,
  validateConditionTree,
  detectConflictingActions,
  detectCircularDependencies,
  countLeafConditions,
} from './validation';
