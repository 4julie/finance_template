// SPDX-License-Identifier: BUSL-1.1

/**
 * Public API for the sector exposure analysis and investment research engines.
 *
 * Re-exports concentration, style-box, overlap, screener, calendar,
 * and scoring modules.
 *
 * References: issues #1603, #1740
 */

// --- Types ---
export {
  GicsSector,
  GICS_SECTOR_LABELS,
  MarketCapSize,
  InvestmentStyle,
  ConcentrationLevel,
  FilterOperator,
  SortDirection,
  EconomicEventType,
  AnalystRating,
  ANALYST_RATING_WEIGHTS,
} from './types';
export type {
  StyleBoxCell,
  StyleBoxPosition,
  StyleBoxAggregate,
  HoldingExposure,
  SectorWeight,
  ConcentrationResult,
  TopHolding,
  OverlapAnalysis,
  PortfolioHolding,
  NumericFilter,
  ScreenerFilters,
  ScreenerSort,
  ScreenableAsset,
  EconomicEvent,
  AnalystOpinion,
  ConsensusResult,
} from './types';

// --- Concentration ---
export {
  bankersRound,
  classifyConcentration,
  calculateHHI,
  getTopNHoldings,
  analyzeConcentration,
  compareSectorWeights,
} from './concentration';

// --- Style Box ---
export {
  classifyMarketCap,
  classifyStyle,
  classifyHolding,
  styleBoxKey,
  getAllStyleBoxCells,
  aggregateStyleBox,
} from './style-box';

// --- Overlap ---
export { analyzeOverlap } from './overlap';

// --- Screener ---
export {
  evaluateNumericFilter,
  matchesFilters,
  screenAssets,
  sortAssets,
  rankAssets,
} from './screener';

// --- Calendar ---
export {
  filterEventsByDateRange,
  filterEventsByType,
  filterEventsBySymbol,
  getUpcomingEvents,
  filterEvents,
} from './calendar';

// --- Scoring ---
export {
  deriveRating,
  computeWeightedScore,
  countRatings,
  computeAverageTargetPrice,
  computeTargetUpside,
  analyzeConsensus,
} from './scoring';
