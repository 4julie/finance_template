// SPDX-License-Identifier: BUSL-1.1

/**
 * Merchant-level spending insights engine.
 *
 * Aggregates spending by merchant, identifies top merchants by spend
 * and frequency, calculates trends over time, and computes average
 * transaction size per merchant.
 *
 * All monetary values are in integer cents. All functions are pure.
 * Uses banker's rounding (HALF_EVEN) for divisions.
 *
 * References: issue #1574
 */

import { bankersRound } from './review-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A transaction for merchant analysis. */
export interface MerchantTransaction {
  /** Unique transaction identifier. */
  readonly id: string;
  /** Merchant or payee name. */
  readonly merchant: string;
  /** Amount in cents (positive = expense). */
  readonly amountCents: number;
  /** Transaction date as ISO 8601 string (YYYY-MM-DD). */
  readonly date: string;
  /** Category identifier. */
  readonly categoryId: string;
}

/** Aggregated spending data for a single merchant. */
export interface MerchantSummary {
  /** Merchant name. */
  readonly merchant: string;
  /** Total spending in cents. */
  readonly totalCents: number;
  /** Number of transactions. */
  readonly transactionCount: number;
  /** Average transaction size in cents (banker's rounded). */
  readonly averageCents: number;
  /** Date of most recent transaction (ISO 8601). */
  readonly lastTransactionDate: string;
  /** Date of earliest transaction (ISO 8601). */
  readonly firstTransactionDate: string;
}

/** Spending data for a merchant in a specific time period. */
export interface MerchantPeriodSpend {
  /** The period identifier (e.g., "2024-01" for January 2024). */
  readonly period: string;
  /** Total spending in cents for this period. */
  readonly totalCents: number;
  /** Number of transactions in this period. */
  readonly transactionCount: number;
}

/** Trend data for a merchant over multiple periods. */
export interface MerchantTrend {
  /** Merchant name. */
  readonly merchant: string;
  /** Per-period spending data, sorted chronologically. */
  readonly periods: readonly MerchantPeriodSpend[];
  /** Change from first to last period in cents. */
  readonly changeCents: number;
  /** Percentage change from first to last period (0 if first is 0). */
  readonly changePercent: number;
}

/** Result of ranking merchants by a given metric. */
export interface TopMerchant {
  /** Merchant name. */
  readonly merchant: string;
  /** The metric value (cents for spend, count for frequency). */
  readonly value: number;
  /** Rank (1-based). */
  readonly rank: number;
}

// ---------------------------------------------------------------------------
// Core aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate transactions by merchant into summaries.
 *
 * @param transactions - The transactions to aggregate.
 * @returns An array of merchant summaries sorted by total spend (descending).
 */
export function aggregateByMerchant(
  transactions: readonly MerchantTransaction[],
): MerchantSummary[] {
  if (transactions.length === 0) return [];

  const map = new Map<string, { total: number; count: number; earliest: string; latest: string }>();

  for (const tx of transactions) {
    const key = tx.merchant;
    const existing = map.get(key);
    if (existing) {
      existing.total += tx.amountCents;
      existing.count++;
      if (tx.date < existing.earliest) existing.earliest = tx.date;
      if (tx.date > existing.latest) existing.latest = tx.date;
    } else {
      map.set(key, {
        total: tx.amountCents,
        count: 1,
        earliest: tx.date,
        latest: tx.date,
      });
    }
  }

  const summaries: MerchantSummary[] = [];
  for (const [merchant, data] of map) {
    summaries.push({
      merchant,
      totalCents: data.total,
      transactionCount: data.count,
      averageCents: data.count > 0 ? bankersRound(data.total / data.count) : 0,
      lastTransactionDate: data.latest,
      firstTransactionDate: data.earliest,
    });
  }

  return summaries.sort((a, b) => b.totalCents - a.totalCents);
}

// ---------------------------------------------------------------------------
// Top merchants
// ---------------------------------------------------------------------------

/**
 * Get top merchants by total spending.
 *
 * @param transactions - The transactions to analyze.
 * @param limit - Maximum number of merchants to return. Defaults to 10.
 * @returns Ranked list of top merchants by spend.
 */
export function topMerchantsBySpend(
  transactions: readonly MerchantTransaction[],
  limit: number = 10,
): TopMerchant[] {
  const summaries = aggregateByMerchant(transactions);
  return summaries.slice(0, Math.max(0, limit)).map((s, i) => ({
    merchant: s.merchant,
    value: s.totalCents,
    rank: i + 1,
  }));
}

/**
 * Get top merchants by transaction frequency.
 *
 * @param transactions - The transactions to analyze.
 * @param limit - Maximum number of merchants to return. Defaults to 10.
 * @returns Ranked list of top merchants by frequency.
 */
export function topMerchantsByFrequency(
  transactions: readonly MerchantTransaction[],
  limit: number = 10,
): TopMerchant[] {
  const summaries = aggregateByMerchant(transactions);
  const sorted = [...summaries].sort((a, b) => b.transactionCount - a.transactionCount);
  return sorted.slice(0, Math.max(0, limit)).map((s, i) => ({
    merchant: s.merchant,
    value: s.transactionCount,
    rank: i + 1,
  }));
}

// ---------------------------------------------------------------------------
// Trend analysis
// ---------------------------------------------------------------------------

/**
 * Extract the year-month period from an ISO date string.
 *
 * @param date - ISO 8601 date string (YYYY-MM-DD).
 * @returns Period string in "YYYY-MM" format.
 */
export function extractPeriod(date: string): string {
  return date.substring(0, 7);
}

/**
 * Calculate spending trends for a specific merchant over time.
 *
 * @param transactions - All transactions (will be filtered to the given merchant).
 * @param merchant - The merchant name to analyze (case-sensitive).
 * @returns Trend data with per-period breakdown and overall change.
 */
export function merchantTrend(
  transactions: readonly MerchantTransaction[],
  merchant: string,
): MerchantTrend {
  const filtered = transactions.filter((tx) => tx.merchant === merchant);

  if (filtered.length === 0) {
    return { merchant, periods: [], changeCents: 0, changePercent: 0 };
  }

  const periodMap = new Map<string, { total: number; count: number }>();
  for (const tx of filtered) {
    const period = extractPeriod(tx.date);
    const existing = periodMap.get(period);
    if (existing) {
      existing.total += tx.amountCents;
      existing.count++;
    } else {
      periodMap.set(period, { total: tx.amountCents, count: 1 });
    }
  }

  const periods: MerchantPeriodSpend[] = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      totalCents: data.total,
      transactionCount: data.count,
    }));

  const first = periods[0].totalCents;
  const last = periods[periods.length - 1].totalCents;
  const changeCents = last - first;
  const changePercent = first !== 0 ? bankersRound((changeCents / first) * 100) : 0;

  return { merchant, periods, changeCents, changePercent };
}

/**
 * Get the average transaction size per merchant.
 *
 * @param transactions - The transactions to analyze.
 * @returns A map of merchant name to average transaction amount in cents.
 */
export function averageTransactionByMerchant(
  transactions: readonly MerchantTransaction[],
): ReadonlyMap<string, number> {
  const summaries = aggregateByMerchant(transactions);
  const result = new Map<string, number>();
  for (const s of summaries) {
    result.set(s.merchant, s.averageCents);
  }
  return result;
}
