// ---------------------------------------------------------------------------
// Expense & Debt Management — Shared Types
// All monetary values are in **integer cents** (e.g. $12.34 → 1234).
// ---------------------------------------------------------------------------

// ── Bulk Operations (#1573) ────────────────────────────────────────────────

/** Criteria that select which transactions a bulk operation applies to. */
export interface BulkSelectionCriteria {
  /** Match transactions whose merchant name contains this substring (case-insensitive). */
  readonly merchantPattern?: string;
  /** Match transactions whose category equals this value. */
  readonly category?: string;
  /** Match transactions on or after this ISO-8601 date string. */
  readonly dateFrom?: string;
  /** Match transactions on or before this ISO-8601 date string. */
  readonly dateTo?: string;
  /** Match transactions whose IDs are in this set. */
  readonly transactionIds?: readonly string[];
  /** Minimum amount in cents (inclusive). */
  readonly minAmountCents?: number;
  /** Maximum amount in cents (inclusive). */
  readonly maxAmountCents?: number;
}

/** A rule that maps matched transactions to a new category. */
export interface RecategorizationRule {
  readonly criteria: BulkSelectionCriteria;
  readonly newCategory: string;
}

/** Supported bulk edit action types. */
export type BulkEditAction =
  | { readonly type: 'recategorize'; readonly newCategory: string }
  | { readonly type: 'adjustAmount'; readonly deltaAmountCents: number }
  | { readonly type: 'applyTag'; readonly tag: string }
  | { readonly type: 'applyNote'; readonly note: string }
  | { readonly type: 'removeTag'; readonly tag: string };

/** Describes a single bulk edit request. */
export interface BulkEditRequest {
  readonly criteria: BulkSelectionCriteria;
  readonly action: BulkEditAction;
}

/** One affected transaction in a bulk edit preview. */
export interface BulkEditPreviewItem {
  readonly transactionId: string;
  readonly fieldChanged: string;
  readonly oldValue: string | number | readonly string[];
  readonly newValue: string | number | readonly string[];
}

/** Summarised result of a bulk operation (dry-run or applied). */
export interface BulkEditSummary {
  readonly matchedCount: number;
  readonly affectedCount: number;
  readonly totalAmountAffectedCents: number;
  readonly previews: readonly BulkEditPreviewItem[];
}

/** A lightweight transaction record used as input to pure functions. */
export interface Transaction {
  readonly id: string;
  readonly merchant: string;
  readonly category: string;
  readonly amountCents: number;
  readonly date: string;
  readonly tags: readonly string[];
  readonly note: string;
  readonly type?: ExpenseType;
  readonly splitRatio?: SplitRatio;
  readonly isDeductible?: boolean;
  readonly deductionCategory?: string;
}

// ── Extra-Payment Simulator (#1666) ────────────────────────────────────────

/** An extra payment scenario that can be one-time or recurring. */
export interface ExtraPaymentScenario {
  readonly debtId: string;
  readonly extraAmountCents: number;
  readonly kind: 'one-time' | 'recurring';
  /** ISO-8601 date when the one-time payment is applied. */
  readonly startDate?: string;
}

/** A single row in an amortisation schedule. */
export interface AmortisationRow {
  readonly month: number;
  readonly principalCents: number;
  readonly interestCents: number;
  readonly balanceCents: number;
  readonly extraPaymentCents: number;
}

/** Full result of a payoff simulation. */
export interface PayoffSimulationResult {
  readonly originalPayoffMonths: number;
  readonly newPayoffMonths: number;
  readonly monthsSaved: number;
  readonly totalInterestOriginalCents: number;
  readonly totalInterestNewCents: number;
  readonly interestSavingsCents: number;
  readonly schedule: readonly AmortisationRow[];
}

/** Allocation result when distributing extra cash across multiple debts. */
export interface OptimalAllocation {
  readonly debtId: string;
  readonly allocationCents: number;
  readonly interestSavingsCents: number;
}

// ── Debt Interest Tracker (#1671) ──────────────────────────────────────────

/** A debt account with its terms. */
export interface DebtAccount {
  readonly id: string;
  readonly name: string;
  readonly balanceCents: number;
  /** Annual interest rate as basis points (e.g. 5.25 % → 525). */
  readonly annualRateBps: number;
  readonly minimumPaymentCents: number;
  readonly originationDate: string;
  /** Optional: total original loan amount in cents. */
  readonly originalBalanceCents?: number;
}

/** Breakdown of interest for a specific period. */
export interface InterestBreakdown {
  readonly periodLabel: string;
  readonly interestAccruedCents: number;
  readonly principalPaidCents: number;
  readonly balanceAfterCents: number;
  readonly interestToPrincipalRatio: number;
}

/** Summary of total cost of a single debt. */
export interface CostOfDebtSummary {
  readonly debtId: string;
  readonly totalInterestLifeCents: number;
  readonly totalPaidCents: number;
  readonly effectiveAnnualRateBps: number;
  readonly remainingInterestCents: number;
  readonly payoffDate: string;
}

/** Portfolio-level stats. */
export interface DebtPortfolioSummary {
  readonly weightedAverageRateBps: number;
  readonly totalBalanceCents: number;
  readonly totalMinimumPaymentCents: number;
  readonly debts: readonly CostOfDebtSummary[];
}

// ── Expense Separation (#1700) ─────────────────────────────────────────────

/** Expense classification type. */
export type ExpenseType = 'business' | 'personal' | 'split';

/** Ratio for split expenses (both values are integer percentages 0-100). */
export interface SplitRatio {
  readonly businessPercent: number;
  readonly personalPercent: number;
}

/** A tagged transaction with its expense classification. */
export interface ClassifiedTransaction {
  readonly transaction: Transaction;
  readonly expenseType: ExpenseType;
  readonly splitRatio?: SplitRatio;
  readonly isDeductible: boolean;
  readonly deductionCategory?: string;
}

/** Quarter identifier. */
export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** Quarterly business expense summary. */
export interface QuarterlyBusinessSummary {
  readonly quarter: Quarter;
  readonly year: number;
  readonly totalBusinessCents: number;
  readonly totalDeductibleCents: number;
  readonly categoryBreakdown: ReadonlyMap<string, number>;
}

/** Business expense report. */
export interface BusinessExpenseReport {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalBusinessCents: number;
  readonly totalDeductibleCents: number;
  readonly totalSplitBusinessPortionCents: number;
  readonly transactions: readonly ClassifiedTransaction[];
  readonly categoryBreakdown: ReadonlyMap<string, number>;
}

/** Mileage/home-office allocation config. */
export interface AllocationConfig {
  readonly type: 'mileage' | 'home-office';
  /** For mileage: rate per mile in cents. For home-office: business-use percentage (0-100). */
  readonly rateOrPercent: number;
  /** For mileage: total miles. For home-office: total expense in cents. */
  readonly quantity: number;
}

// ── Debt Settlement (#1793) ────────────────────────────────────────────────

/** A settlement offer on a debt. */
export interface SettlementOffer {
  readonly debtId: string;
  readonly originalBalanceCents: number;
  readonly offeredAmountCents: number;
  /** Savings compared to paying in full (cents). */
  readonly savingsCents: number;
  readonly savingsPercent: number;
  readonly offerType: 'lump-sum' | 'payment-plan';
  /** For payment plans: number of installments. */
  readonly installments?: number;
  /** For payment plans: amount per installment in cents. */
  readonly installmentAmountCents?: number;
}

/** Credit score impact estimation bucket. */
export type CreditImpactLevel = 'minimal' | 'moderate' | 'significant' | 'severe';

/** Credit impact estimate from a settlement action. */
export interface CreditImpactEstimate {
  readonly action: string;
  readonly impactLevel: CreditImpactLevel;
  readonly estimatedPointsRange: readonly [number, number];
  readonly recoveryMonths: number;
  readonly notes: string;
}

/** Payoff strategy comparison. */
export type PayoffStrategy = 'avalanche' | 'snowball' | 'settlement';

/** Result of comparing payoff strategies. */
export interface PayoffStrategyComparison {
  readonly strategy: PayoffStrategy;
  readonly totalPaidCents: number;
  readonly totalInterestCents: number;
  readonly payoffMonths: number;
  readonly monthlyPaymentCents: number;
}

/** Consolidation analysis result. */
export interface ConsolidationAnalysis {
  readonly currentDebts: readonly DebtAccount[];
  readonly consolidatedRateBps: number;
  readonly consolidatedBalanceCents: number;
  readonly currentTotalInterestCents: number;
  readonly consolidatedTotalInterestCents: number;
  readonly interestSavingsCents: number;
  readonly currentPayoffMonths: number;
  readonly consolidatedPayoffMonths: number;
  readonly isRecommended: boolean;
}

/** Negotiation tracking entry. */
export interface NegotiationEntry {
  readonly debtId: string;
  readonly date: string;
  readonly offeredAmountCents: number;
  readonly counterOfferCents?: number;
  readonly status: 'pending' | 'accepted' | 'rejected' | 'countered';
  readonly notes: string;
}
