// SPDX-License-Identifier: BUSL-1.1

/**
 * Investment domain types for account taxonomy, lot-level cost-basis tracking,
 * target-vs-actual asset allocation, and fee analysis.
 *
 * All monetary values are integer cents. Shares use floating-point to support
 * fractional shares (e.g., 0.5 shares of BRK.A).
 *
 * References: issues #1585, #1588, #1595, #1625
 */

import type { Cents, Instant, LocalDate, SyncId } from '../kmp/bridge';

// ---------------------------------------------------------------------------
// #1585 — Account taxonomy and tax-treatment metadata
// ---------------------------------------------------------------------------

/** Tax treatment classification for investment accounts. */
export type TaxTreatment = 'TAXABLE' | 'TAX_DEFERRED' | 'TAX_FREE';

/** Specific investment account sub-types within each tax treatment. */
export type InvestmentAccountSubtype =
  | 'BROKERAGE'
  | 'TRADITIONAL_IRA'
  | 'ROTH_IRA'
  | 'SEP_IRA'
  | 'SIMPLE_IRA'
  | '401K'
  | '403B'
  | '457B'
  | 'HSA'
  | '529'
  | 'TRUST'
  | 'OTHER';

/** Map from account subtype to its tax treatment. */
export const ACCOUNT_SUBTYPE_TAX_TREATMENT: Record<InvestmentAccountSubtype, TaxTreatment> = {
  BROKERAGE: 'TAXABLE',
  TRADITIONAL_IRA: 'TAX_DEFERRED',
  SEP_IRA: 'TAX_DEFERRED',
  SIMPLE_IRA: 'TAX_DEFERRED',
  '401K': 'TAX_DEFERRED',
  '403B': 'TAX_DEFERRED',
  '457B': 'TAX_DEFERRED',
  ROTH_IRA: 'TAX_FREE',
  HSA: 'TAX_FREE',
  '529': 'TAX_FREE',
  TRUST: 'TAXABLE',
  OTHER: 'TAXABLE',
};

/** Human-readable labels for investment account subtypes. */
export const ACCOUNT_SUBTYPE_LABELS: Record<InvestmentAccountSubtype, string> = {
  BROKERAGE: 'Taxable Brokerage',
  TRADITIONAL_IRA: 'Traditional IRA',
  ROTH_IRA: 'Roth IRA',
  SEP_IRA: 'SEP IRA',
  SIMPLE_IRA: 'SIMPLE IRA',
  '401K': '401(k)',
  '403B': '403(b)',
  '457B': '457(b)',
  HSA: 'HSA',
  '529': '529 Plan',
  TRUST: 'Trust',
  OTHER: 'Other',
};

/** Human-readable labels for tax treatments. */
export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  TAXABLE: 'Taxable',
  TAX_DEFERRED: 'Tax-Deferred',
  TAX_FREE: 'Tax-Free',
};

/** Extended account metadata for investment accounts. */
export interface InvestmentAccountMetadata {
  readonly subtype: InvestmentAccountSubtype;
  readonly taxTreatment: TaxTreatment;
  readonly institutionName: string | null;
  readonly accountNumber: string | null;
}

// ---------------------------------------------------------------------------
// #1588 — Lot-level position detail and cost-basis tracking
// ---------------------------------------------------------------------------

/** Cost-basis calculation method. */
export type CostBasisMethod = 'FIFO' | 'LIFO' | 'SPECIFIC_ID' | 'AVERAGE_COST';

/** Human-readable labels for cost-basis methods. */
export const COST_BASIS_METHOD_LABELS: Record<CostBasisMethod, string> = {
  FIFO: 'First In, First Out (FIFO)',
  LIFO: 'Last In, First Out (LIFO)',
  SPECIFIC_ID: 'Specific Identification',
  AVERAGE_COST: 'Average Cost',
};

/** A single purchase lot for a position. */
export interface Lot {
  readonly id: SyncId;
  readonly investmentId: SyncId;
  readonly purchaseDate: LocalDate;
  /** Number of shares in this lot. */
  readonly shares: number;
  /** Cost per share in cents at time of purchase. */
  readonly costPerShare: Cents;
  /** Total cost basis in cents (shares × costPerShare). */
  readonly totalCost: Cents;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
}

/** Computed gain/loss details for a single lot. */
export interface LotGainLoss {
  readonly lot: Lot;
  /** Current market value of this lot in cents. */
  readonly marketValue: number;
  /** Unrealized gain/loss in cents. */
  readonly unrealizedGainLoss: number;
  /** Unrealized gain/loss as a percentage of cost basis. */
  readonly unrealizedGainLossPercent: number;
  /** Whether this lot qualifies as a long-term holding (> 1 year). */
  readonly isLongTerm: boolean;
  /** Number of days held. */
  readonly daysHeld: number;
}

/** Wash sale detection result for a lot. */
export interface WashSaleAlert {
  readonly lotId: SyncId;
  readonly symbol: string;
  /** The lot that was sold at a loss. */
  readonly soldDate: LocalDate;
  /** The replacement purchase that triggered the wash sale. */
  readonly replacementDate: LocalDate;
  /** The disallowed loss amount in cents. */
  readonly disallowedLoss: number;
}

// ---------------------------------------------------------------------------
// #1595 — Target-vs-actual asset allocation
// ---------------------------------------------------------------------------

/** Asset class for allocation purposes. */
export type AssetClass =
  | 'US_STOCKS'
  | 'INTERNATIONAL_STOCKS'
  | 'BONDS'
  | 'REAL_ESTATE'
  | 'COMMODITIES'
  | 'CRYPTO'
  | 'CASH'
  | 'OTHER';

/** Human-readable labels for asset classes. */
export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  US_STOCKS: 'US Stocks',
  INTERNATIONAL_STOCKS: 'International Stocks',
  BONDS: 'Bonds',
  REAL_ESTATE: 'Real Estate',
  COMMODITIES: 'Commodities',
  CRYPTO: 'Crypto',
  CASH: 'Cash',
  OTHER: 'Other',
};

/** Target allocation for a single asset class (percentage 0–100). */
export interface AllocationTarget {
  readonly assetClass: AssetClass;
  /** Target percentage (0–100). */
  readonly targetPercent: number;
}

/** Actual allocation computed from current holdings. */
export interface AllocationActual {
  readonly assetClass: AssetClass;
  /** Current value in cents. */
  readonly currentValue: number;
  /** Actual percentage (0–100). */
  readonly actualPercent: number;
}

/** Combined target vs actual for one asset class. */
export interface AllocationComparison {
  readonly assetClass: AssetClass;
  readonly label: string;
  readonly targetPercent: number;
  readonly actualPercent: number;
  /** Deviation: actual - target. Positive = overweight, negative = underweight. */
  readonly deviationPercent: number;
  readonly currentValue: number;
  /** Target value in cents based on total portfolio value. */
  readonly targetValue: number;
  /** Amount to buy (positive) or sell (negative) in cents to rebalance. */
  readonly rebalanceAmount: number;
}

/** Full allocation analysis result. */
export interface AllocationAnalysis {
  readonly totalPortfolioValue: number;
  readonly comparisons: readonly AllocationComparison[];
  /** True if all target percentages sum to 100%. */
  readonly isTargetValid: boolean;
}

// ---------------------------------------------------------------------------
// #1625 — Fee analysis and fee-drag calculation
// ---------------------------------------------------------------------------

/** Fee metadata for a fund or ETF holding. */
export interface FundFeeInfo {
  readonly investmentId: SyncId;
  readonly symbol: string;
  readonly name: string;
  /** Expense ratio as basis points (e.g., 3 = 0.03%). */
  readonly expenseRatioBps: number;
  /** Current market value in cents. */
  readonly marketValue: number;
  /** Annual fee in cents (marketValue × expenseRatio). */
  readonly annualFee: number;
}

/** Portfolio-level fee summary. */
export interface PortfolioFeeSummary {
  /** Total portfolio value in cents. */
  readonly totalValue: number;
  /** Weighted average expense ratio in basis points. */
  readonly weightedExpenseRatioBps: number;
  /** Total annual fees in cents. */
  readonly totalAnnualFees: number;
  /** Per-fund fee breakdown. */
  readonly fundFees: readonly FundFeeInfo[];
}

/** Fee drag projection for a single time horizon. */
export interface FeeDragProjection {
  /** Number of years projected. */
  readonly years: number;
  /** Portfolio value without fees in cents. */
  readonly valueWithoutFees: number;
  /** Portfolio value with current fees in cents. */
  readonly valueWithFees: number;
  /** Total fees paid over the period in cents. */
  readonly totalFeesPaid: number;
  /** Percentage of returns lost to fees. */
  readonly feeDragPercent: number;
}

/** Comparison scenario for "what if lower fees". */
export interface FeeComparisonScenario {
  readonly label: string;
  /** Alternative expense ratio in basis points. */
  readonly expenseRatioBps: number;
  readonly projections: readonly FeeDragProjection[];
}

/** Full fee analysis result. */
export interface FeeAnalysis {
  readonly summary: PortfolioFeeSummary;
  /** Fee drag projections at 10, 20, 30 year horizons. */
  readonly projections: readonly FeeDragProjection[];
  /** Comparison with lower-fee alternatives. */
  readonly comparisons: readonly FeeComparisonScenario[];
}
