// SPDX-License-Identifier: BUSL-1.1

/**
 * React hook for accessing and mutating investment portfolio data.
 *
 * Reads from the local SQLite-WASM database via the investments repository.
 * All operations are synchronous against the local DB; errors are captured
 * in state rather than thrown so callers can render gracefully.
 *
 * Extended to support lot-level cost-basis tracking (#1588),
 * target-vs-actual allocation (#1595), and fee analysis (#1625).
 *
 * Usage:
 * ```tsx
 * const { investments, loading, error, createInvestment, refresh } = useInvestments();
 * ```
 *
 * References: issues #1105, #1585, #1588, #1595, #1625
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDatabase } from '../db/DatabaseProvider';
import {
  createInvestment as repoCreateInvestment,
  deleteInvestment as repoDeleteInvestment,
  getAllInvestments,
  updateInvestment as repoUpdateInvestment,
  type CreateInvestmentInput,
  type UpdateInvestmentInput,
} from '../db/repositories/investments';
import {
  createLot as repoCreateLot,
  deleteLot as repoDeleteLot,
  getLotsByInvestment,
  updateLot as repoUpdateLot,
  type CreateLotInput,
  type UpdateLotInput,
} from '../db/repositories/investment-lots';
import type { Investment, InvestmentLot, SyncId } from '../kmp/bridge';
import { computeAllocation, analyzeFees, DEFAULT_ASSET_CLASS_MAP } from '../lib/investment';
import type { HoldingWithClass, FeeHoldingInput } from '../lib/investment';
import type { AllocationAnalysis, AllocationTarget, FeeAnalysis } from '../types/investment';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Computed portfolio summary statistics. */
export interface PortfolioSummary {
  /** Total current market value in cents. */
  totalValue: number;
  /** Total cost basis in cents. */
  totalCostBasis: number;
  /** Total gain/loss in cents. */
  totalGainLoss: number;
  /** Total gain/loss as a percentage of cost basis. */
  totalGainLossPercent: number;
}

/** Shape returned by {@link useInvestments}. */
export interface UseInvestmentsResult {
  /** All non-deleted investments ordered by symbol. */
  investments: Investment[];
  /** Computed portfolio summary statistics. */
  summary: PortfolioSummary;
  /** `true` while the initial or refresh load is in progress. */
  loading: boolean;
  /** Human-readable error message from the last failed operation, or `null`. */
  error: string | null;
  /** Trigger a re-fetch of all investments from the local database. */
  refresh: () => void;
  /**
   * Create a new investment and automatically refresh the list.
   * @returns The created investment, or `null` if creation failed.
   */
  createInvestment: (input: CreateInvestmentInput) => Investment | null;
  /**
   * Update an existing investment and automatically refresh the list.
   * @returns The updated investment, or `null` if the investment was not found or update failed.
   */
  updateInvestment: (investmentId: SyncId, updates: UpdateInvestmentInput) => Investment | null;
  /**
   * Soft-delete an investment and automatically refresh the list.
   * @returns `true` if deletion succeeded, `false` otherwise.
   */
  deleteInvestment: (investmentId: SyncId) => boolean;

  // --- Lot operations (#1588) ---

  /**
   * Get all lots for a specific investment.
   * @returns Array of lots, or empty array on error.
   */
  getLots: (investmentId: SyncId) => InvestmentLot[];
  /**
   * Create a new lot for an investment.
   * @returns The created lot, or `null` if creation failed.
   */
  createLot: (input: CreateLotInput) => InvestmentLot | null;
  /**
   * Update an existing lot.
   * @returns The updated lot, or `null` if not found or update failed.
   */
  updateLot: (lotId: SyncId, updates: UpdateLotInput) => InvestmentLot | null;
  /**
   * Soft-delete a lot.
   * @returns `true` if deletion succeeded, `false` otherwise.
   */
  deleteLot: (lotId: SyncId) => boolean;

  // --- Allocation analysis (#1595) ---

  /**
   * Compute target-vs-actual allocation analysis.
   * @param targets - User-defined target allocation percentages.
   * @returns Allocation analysis with deviations and rebalancing suggestions.
   */
  computeAllocationAnalysis: (targets: readonly AllocationTarget[]) => AllocationAnalysis;

  // --- Fee analysis (#1625) ---

  /**
   * Run fee analysis for the portfolio.
   * @param expenseRatios - Map of investmentId → expense ratio in basis points.
   * @param annualReturnPercent - Expected annual return (default: 7%).
   * @returns Complete fee analysis with projections and comparisons.
   */
  computeFeeAnalysis: (
    expenseRatios: ReadonlyMap<string, number>,
    annualReturnPercent?: number,
  ) => FeeAnalysis;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute portfolio summary from a list of investments. */
function computeSummary(investments: Investment[]): PortfolioSummary {
  let totalValue = 0;
  let totalCostBasis = 0;

  for (const inv of investments) {
    totalValue += inv.shares * inv.currentPricePerShare.amount;
    totalCostBasis += inv.shares * inv.costBasisPerShare.amount;
  }

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  return {
    totalValue: Math.round(totalValue),
    totalCostBasis: Math.round(totalCostBasis),
    totalGainLoss: Math.round(totalGainLoss),
    totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Load all investments from the local database and expose CRUD operations. */
export function useInvestments(): UseInvestmentsResult {
  const db = useDatabase();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  /** Increment the refresh token to trigger a data re-fetch. */
  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshToken((t) => t + 1);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const result = getAllInvestments(db);
      setInvestments(result);
    } catch (err) {
      // If the table doesn't exist yet, treat it as empty (not an error).
      const message = err instanceof Error ? err.message : '';
      if (message.includes('no such table')) {
        setInvestments([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load investments.');
        setInvestments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [db, refreshToken]);

  const summary = computeSummary(investments);

  const createInvestment = useCallback(
    (input: CreateInvestmentInput): Investment | null => {
      try {
        const created = repoCreateInvestment(db, input);
        refresh();
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create investment.');
        setLoading(false);
        return null;
      }
    },
    [db, refresh],
  );

  const updateInvestment = useCallback(
    (investmentId: SyncId, updates: UpdateInvestmentInput): Investment | null => {
      try {
        const updated = repoUpdateInvestment(db, investmentId, updates);
        if (updated !== null) {
          refresh();
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update investment.');
        setLoading(false);
        return null;
      }
    },
    [db, refresh],
  );

  const deleteInvestment = useCallback(
    (investmentId: SyncId): boolean => {
      try {
        const deleted = repoDeleteInvestment(db, investmentId);
        if (deleted) {
          refresh();
        }
        return deleted;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete investment.');
        setLoading(false);
        return false;
      }
    },
    [db, refresh],
  );

  // --- Lot operations (#1588) ---

  const getLots = useCallback(
    (investmentId: SyncId): InvestmentLot[] => {
      try {
        return getLotsByInvestment(db, investmentId);
      } catch (err) {
        const message = err instanceof Error ? err.message : '';
        if (!message.includes('no such table')) {
          setError(err instanceof Error ? err.message : 'Failed to load lots.');
        }
        return [];
      }
    },
    [db],
  );

  const createLot = useCallback(
    (input: CreateLotInput): InvestmentLot | null => {
      try {
        const created = repoCreateLot(db, input);
        refresh();
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create lot.');
        setLoading(false);
        return null;
      }
    },
    [db, refresh],
  );

  const updateLotFn = useCallback(
    (lotId: SyncId, updates: UpdateLotInput): InvestmentLot | null => {
      try {
        const updated = repoUpdateLot(db, lotId, updates);
        if (updated !== null) {
          refresh();
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update lot.');
        setLoading(false);
        return null;
      }
    },
    [db, refresh],
  );

  const deleteLotFn = useCallback(
    (lotId: SyncId): boolean => {
      try {
        const deleted = repoDeleteLot(db, lotId);
        if (deleted) {
          refresh();
        }
        return deleted;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete lot.');
        setLoading(false);
        return false;
      }
    },
    [db, refresh],
  );

  // --- Allocation analysis (#1595) ---

  const holdingsWithClass: HoldingWithClass[] = useMemo(
    () =>
      investments.map((inv) => ({
        symbol: inv.symbol,
        marketValue: Math.round(inv.shares * inv.currentPricePerShare.amount),
        assetClass: DEFAULT_ASSET_CLASS_MAP[inv.type],
      })),
    [investments],
  );

  const computeAllocationAnalysis = useCallback(
    (targets: readonly AllocationTarget[]): AllocationAnalysis => {
      return computeAllocation(holdingsWithClass, targets);
    },
    [holdingsWithClass],
  );

  // --- Fee analysis (#1625) ---

  const computeFeeAnalysis = useCallback(
    (expenseRatios: ReadonlyMap<string, number>, annualReturnPercent: number = 7): FeeAnalysis => {
      const feeHoldings: FeeHoldingInput[] = investments
        .filter((inv) => expenseRatios.has(inv.id))
        .map((inv) => ({
          investmentId: inv.id,
          symbol: inv.symbol,
          name: inv.name,
          expenseRatioBps: expenseRatios.get(inv.id) ?? 0,
          marketValue: Math.round(inv.shares * inv.currentPricePerShare.amount),
        }));

      return analyzeFees(feeHoldings, annualReturnPercent);
    },
    [investments],
  );

  return {
    investments,
    summary,
    loading,
    error,
    refresh,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    getLots,
    createLot,
    updateLot: updateLotFn,
    deleteLot: deleteLotFn,
    computeAllocationAnalysis,
    computeFeeAnalysis,
  };
}
