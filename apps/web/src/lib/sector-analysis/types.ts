// SPDX-License-Identifier: BUSL-1.1

/**
 * Sector exposure analysis types and enums.
 *
 * Defines GICS sector classifications, Morningstar-style box dimensions,
 * holding exposure data, concentration results, and overlap analysis types.
 *
 * All monetary values are in integer cents to avoid floating-point errors.
 *
 * References: issues #1603, #1740
 */

// ---------------------------------------------------------------------------
// GICS Sector Classification
// ---------------------------------------------------------------------------

/**
 * Global Industry Classification Standard (GICS) sectors.
 * The 11 top-level sectors used for portfolio exposure analysis.
 */
export enum GicsSector {
  ENERGY = 'ENERGY',
  MATERIALS = 'MATERIALS',
  INDUSTRIALS = 'INDUSTRIALS',
  CONSUMER_DISCRETIONARY = 'CONSUMER_DISCRETIONARY',
  CONSUMER_STAPLES = 'CONSUMER_STAPLES',
  HEALTH_CARE = 'HEALTH_CARE',
  FINANCIALS = 'FINANCIALS',
  INFORMATION_TECHNOLOGY = 'INFORMATION_TECHNOLOGY',
  COMMUNICATION_SERVICES = 'COMMUNICATION_SERVICES',
  UTILITIES = 'UTILITIES',
  REAL_ESTATE = 'REAL_ESTATE',
}

/** Human-readable labels for each GICS sector. */
export const GICS_SECTOR_LABELS: Readonly<Record<GicsSector, string>> = {
  [GicsSector.ENERGY]: 'Energy',
  [GicsSector.MATERIALS]: 'Materials',
  [GicsSector.INDUSTRIALS]: 'Industrials',
  [GicsSector.CONSUMER_DISCRETIONARY]: 'Consumer Discretionary',
  [GicsSector.CONSUMER_STAPLES]: 'Consumer Staples',
  [GicsSector.HEALTH_CARE]: 'Health Care',
  [GicsSector.FINANCIALS]: 'Financials',
  [GicsSector.INFORMATION_TECHNOLOGY]: 'Information Technology',
  [GicsSector.COMMUNICATION_SERVICES]: 'Communication Services',
  [GicsSector.UTILITIES]: 'Utilities',
  [GicsSector.REAL_ESTATE]: 'Real Estate',
};

// ---------------------------------------------------------------------------
// Morningstar Style Box
// ---------------------------------------------------------------------------

/** Market-capitalization size classification. */
export enum MarketCapSize {
  SMALL = 'SMALL',
  MID = 'MID',
  LARGE = 'LARGE',
}

/** Investment style classification. */
export enum InvestmentStyle {
  VALUE = 'VALUE',
  BLEND = 'BLEND',
  GROWTH = 'GROWTH',
}

/**
 * A single cell in the Morningstar 3×3 style box.
 * Combines market-cap size with investment style.
 */
export interface StyleBoxCell {
  readonly size: MarketCapSize;
  readonly style: InvestmentStyle;
}

/**
 * A holding's position within the style box, including its weight.
 */
export interface StyleBoxPosition {
  readonly symbol: string;
  readonly cell: StyleBoxCell;
  /** Market value in cents. */
  readonly marketValue: number;
}

/**
 * Aggregate style box result for a portfolio.
 * Each cell has a percentage weight (0–100, sums to 100).
 */
export interface StyleBoxAggregate {
  /** Weight in each style-box cell as percentage (0–100). */
  readonly weights: ReadonlyArray<{
    readonly cell: StyleBoxCell;
    readonly percent: number;
  }>;
  /** The dominant cell with the highest weight. */
  readonly dominant: StyleBoxCell;
  /** Total market value of classified holdings in cents. */
  readonly totalClassifiedValue: number;
}

// ---------------------------------------------------------------------------
// Holding Exposure
// ---------------------------------------------------------------------------

/**
 * A single holding's exposure data for analysis.
 */
export interface HoldingExposure {
  /** Ticker symbol. */
  readonly symbol: string;
  /** Display name. */
  readonly name: string;
  /** Market value in cents. */
  readonly marketValue: number;
  /** GICS sector classification. */
  readonly sector: GicsSector;
  /** Portfolio weight as percentage (0–100). */
  readonly weightPercent: number;
}

/**
 * Sector weight comparison against a benchmark.
 */
export interface SectorWeight {
  readonly sector: GicsSector;
  /** Portfolio weight as percentage (0–100). */
  readonly portfolioPercent: number;
  /** Benchmark weight as percentage (0–100). */
  readonly benchmarkPercent: number;
  /** Deviation: portfolio minus benchmark. */
  readonly deviationPercent: number;
}

// ---------------------------------------------------------------------------
// Concentration Analysis
// ---------------------------------------------------------------------------

/**
 * Result of a portfolio concentration analysis.
 */
export interface ConcentrationResult {
  /**
   * Herfindahl-Hirschman Index (0–10000).
   * Sum of squared portfolio weights where each weight is 0–100.
   * 10000 = single holding; lower = more diversified.
   */
  readonly hhi: number;
  /** Concentration level category. */
  readonly level: ConcentrationLevel;
  /** Top-N holdings by weight. */
  readonly topHoldings: readonly TopHolding[];
  /** Cumulative weight of the top-N holdings (0–100). */
  readonly topNPercent: number;
  /** Total number of holdings. */
  readonly totalHoldings: number;
}

/** Concentration level classification based on HHI. */
export enum ConcentrationLevel {
  /** HHI < 1500 — well-diversified. */
  LOW = 'LOW',
  /** HHI 1500–2500 — moderately concentrated. */
  MODERATE = 'MODERATE',
  /** HHI > 2500 — highly concentrated. */
  HIGH = 'HIGH',
}

/** A holding in the top-N list with its weight. */
export interface TopHolding {
  readonly symbol: string;
  readonly name: string;
  /** Market value in cents. */
  readonly marketValue: number;
  /** Portfolio weight percentage (0–100). */
  readonly weightPercent: number;
}

// ---------------------------------------------------------------------------
// Overlap Analysis
// ---------------------------------------------------------------------------

/**
 * Result of an overlap analysis between two portfolios.
 */
export interface OverlapAnalysis {
  /** Percentage of portfolio A's value in shared holdings (0–100). */
  readonly overlapPercentA: number;
  /** Percentage of portfolio B's value in shared holdings (0–100). */
  readonly overlapPercentB: number;
  /** Average overlap percentage across both portfolios. */
  readonly overlapPercentAvg: number;
  /** Symbols present in both portfolios. */
  readonly sharedSymbols: readonly string[];
  /** Count of unique holdings in portfolio A only. */
  readonly uniqueToA: number;
  /** Count of unique holdings in portfolio B only. */
  readonly uniqueToB: number;
  /** Estimated weight-based correlation (-1 to 1). */
  readonly correlationEstimate: number;
}

/**
 * A simplified portfolio holding for overlap comparison.
 */
export interface PortfolioHolding {
  readonly symbol: string;
  /** Market value in cents. */
  readonly marketValue: number;
}

// ---------------------------------------------------------------------------
// Screener Types
// ---------------------------------------------------------------------------

/** Comparison operator for numeric filters. */
export enum FilterOperator {
  EQ = 'EQ',
  NEQ = 'NEQ',
  GT = 'GT',
  GTE = 'GTE',
  LT = 'LT',
  LTE = 'LTE',
  BETWEEN = 'BETWEEN',
}

/** A numeric range filter (e.g., P/E ratio 10–20). */
export interface NumericFilter {
  readonly field: string;
  readonly operator: FilterOperator;
  /** Primary value for comparison. */
  readonly value: number;
  /** Upper bound when operator is BETWEEN. */
  readonly valueTo?: number;
}

/** Screener filter criteria for investment screening. */
export interface ScreenerFilters {
  /** P/E ratio range. */
  readonly peRatio?: NumericFilter;
  /** Market capitalization in cents. */
  readonly marketCap?: NumericFilter;
  /** Dividend yield as percentage (0–100). */
  readonly dividendYield?: NumericFilter;
  /** Filter by GICS sectors. */
  readonly sectors?: readonly GicsSector[];
  /** Filter by style box classification. */
  readonly styles?: readonly StyleBoxCell[];
}

/** Sort direction for screener results. */
export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

/** Sort specification for screener results. */
export interface ScreenerSort {
  readonly field: string;
  readonly direction: SortDirection;
}

/** A screenable security with fundamental data. */
export interface ScreenableAsset {
  readonly symbol: string;
  readonly name: string;
  /** P/E ratio (price-to-earnings). Null if not applicable. */
  readonly peRatio: number | null;
  /** Market capitalization in cents. */
  readonly marketCap: number;
  /** Dividend yield as percentage (0–100). Null if none. */
  readonly dividendYield: number | null;
  /** GICS sector. */
  readonly sector: GicsSector;
  /** Style box classification. */
  readonly styleBox: StyleBoxCell;
}

// ---------------------------------------------------------------------------
// Economic Calendar Types
// ---------------------------------------------------------------------------

/** Type of economic/corporate event. */
export enum EconomicEventType {
  EARNINGS = 'EARNINGS',
  DIVIDEND = 'DIVIDEND',
  STOCK_SPLIT = 'STOCK_SPLIT',
  FED_MEETING = 'FED_MEETING',
  CPI_RELEASE = 'CPI_RELEASE',
  JOBS_REPORT = 'JOBS_REPORT',
  GDP_RELEASE = 'GDP_RELEASE',
  EX_DIVIDEND = 'EX_DIVIDEND',
  IPO = 'IPO',
  OTHER = 'OTHER',
}

/** An event on the economic calendar. */
export interface EconomicEvent {
  /** Unique event identifier. */
  readonly id: string;
  /** Event type. */
  readonly type: EconomicEventType;
  /** Event title. */
  readonly title: string;
  /** ISO 8601 date string (YYYY-MM-DD). */
  readonly date: string;
  /** Related ticker symbol, if applicable. */
  readonly symbol?: string;
  /** Additional description or context. */
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Analyst Scoring Types
// ---------------------------------------------------------------------------

/** Analyst recommendation rating. */
export enum AnalystRating {
  STRONG_BUY = 'STRONG_BUY',
  BUY = 'BUY',
  HOLD = 'HOLD',
  SELL = 'SELL',
  STRONG_SELL = 'STRONG_SELL',
}

/** Numeric weight for each analyst rating (higher = more bullish). */
export const ANALYST_RATING_WEIGHTS: Readonly<Record<AnalystRating, number>> = {
  [AnalystRating.STRONG_BUY]: 5,
  [AnalystRating.BUY]: 4,
  [AnalystRating.HOLD]: 3,
  [AnalystRating.SELL]: 2,
  [AnalystRating.STRONG_SELL]: 1,
};

/** A single analyst's opinion on a security. */
export interface AnalystOpinion {
  /** Analyst or firm name. */
  readonly analyst: string;
  /** Rating recommendation. */
  readonly rating: AnalystRating;
  /** Target price in cents. Null if not provided. */
  readonly targetPrice: number | null;
  /** Date of the opinion (ISO 8601). */
  readonly date: string;
}

/** Aggregated consensus result for a security. */
export interface ConsensusResult {
  /** Ticker symbol. */
  readonly symbol: string;
  /** Total number of analyst opinions. */
  readonly totalAnalysts: number;
  /** Weighted average score (1–5 scale). */
  readonly weightedScore: number;
  /** Consensus rating derived from the weighted score. */
  readonly consensusRating: AnalystRating;
  /** Count of each rating type. */
  readonly ratingCounts: Readonly<Record<AnalystRating, number>>;
  /** Average target price in cents. Null if no targets available. */
  readonly averageTargetPrice: number | null;
  /** Current price in cents. */
  readonly currentPrice: number;
  /** Upside/downside percentage vs average target. Null if no targets. */
  readonly targetUpsidePercent: number | null;
}
