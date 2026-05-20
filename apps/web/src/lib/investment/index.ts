// SPDX-License-Identifier: BUSL-1.1

/**
 * Public API for the investment calculation engines.
 *
 * Re-exports cost-basis, allocation, and fee analysis modules.
 *
 * References: issues #1585, #1588, #1595, #1625
 */

export {
  computeLotGainLoss,
  computeAllLotGainLoss,
  selectLotsForSale,
  computeAverageCostBasis,
  detectWashSales,
} from './cost-basis';

export {
  DEFAULT_ASSET_CLASS_MAP,
  ALLOCATION_PRESETS,
  validateTargets,
  computeAllocation,
  getRebalancingSuggestions,
} from './allocation';
export type { HoldingWithClass, AllocationPreset } from './allocation';

export {
  computeFeeSummary,
  projectFeeDrag,
  projectFeeDragMultiYear,
  generateFeeComparisons,
  analyzeFees,
  formatExpenseRatio,
  DEFAULT_FEE_COMPARISON_SCENARIOS,
} from './fee-analysis';
export type { FeeHoldingInput } from './fee-analysis';
