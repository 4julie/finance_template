// SPDX-License-Identifier: BUSL-1.1

/**
 * Cost-basis calculation engine for lot-level investment tracking.
 *
 * Supports FIFO, LIFO, specific identification, and average cost methods.
 * All monetary values are integer cents. Wash sale detection uses the
 * IRS 30-day rule (no replacement purchase within 30 days of a loss sale).
 *
 * References: issue #1588
 */

import type { Cents, LocalDate } from '../../kmp/bridge';
import type { CostBasisMethod, Lot, LotGainLoss, WashSaleAlert } from '../../types/investment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse an ISO-8601 date string to a Date object. */
function parseDate(dateStr: LocalDate): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

/** Calculate the number of days between two ISO date strings. */
function daysBetween(startDate: LocalDate, endDate: LocalDate): number {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/** Get today as an ISO-8601 date string. */
function todayISO(): LocalDate {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Lot-level gain/loss
// ---------------------------------------------------------------------------

/**
 * Compute unrealized gain/loss for a single lot.
 *
 * @param lot - The purchase lot.
 * @param currentPricePerShareCents - Current market price per share in cents.
 * @param asOfDate - Date to compute against (defaults to today).
 * @returns Computed gain/loss details.
 */
export function computeLotGainLoss(
  lot: Lot,
  currentPricePerShareCents: number,
  asOfDate?: LocalDate,
): LotGainLoss {
  const evalDate = asOfDate ?? todayISO();
  const marketValue = Math.round(lot.shares * currentPricePerShareCents);
  const costBasis = lot.totalCost.amount;
  const unrealizedGainLoss = marketValue - costBasis;
  const unrealizedGainLossPercent =
    costBasis !== 0 ? Math.round((unrealizedGainLoss / costBasis) * 10000) / 100 : 0;
  const daysHeld = daysBetween(lot.purchaseDate, evalDate);
  const isLongTerm = daysHeld > 365;

  return {
    lot,
    marketValue,
    unrealizedGainLoss,
    unrealizedGainLossPercent,
    isLongTerm,
    daysHeld,
  };
}

/**
 * Compute gain/loss for all lots of a position.
 *
 * @param lots - All lots for a single symbol/investment.
 * @param currentPricePerShareCents - Current price per share in cents.
 * @param asOfDate - Date to compute against (defaults to today).
 * @returns Array of lot gain/loss computations.
 */
export function computeAllLotGainLoss(
  lots: readonly Lot[],
  currentPricePerShareCents: number,
  asOfDate?: LocalDate,
): LotGainLoss[] {
  return lots.map((lot) => computeLotGainLoss(lot, currentPricePerShareCents, asOfDate));
}

// ---------------------------------------------------------------------------
// Cost-basis methods — select lots to sell
// ---------------------------------------------------------------------------

/**
 * Select lots to sell using the specified cost-basis method.
 *
 * Returns lots in the order they should be sold, along with the total
 * cost basis for the shares being sold.
 *
 * @param lots - Available lots for the position.
 * @param sharesToSell - Number of shares to sell.
 * @param method - Cost-basis selection method.
 * @param specificLotIds - Lot IDs for specific identification method.
 * @returns Selected lots with adjusted shares, and total cost basis in cents.
 */
export function selectLotsForSale(
  lots: readonly Lot[],
  sharesToSell: number,
  method: CostBasisMethod,
  specificLotIds?: readonly string[],
): { selectedLots: Array<{ lot: Lot; sharesToSell: number }>; totalCostBasis: number } {
  if (sharesToSell <= 0) {
    return { selectedLots: [], totalCostBasis: 0 };
  }

  let orderedLots: readonly Lot[];

  switch (method) {
    case 'FIFO':
      orderedLots = [...lots].sort(
        (a, b) => parseDate(a.purchaseDate).getTime() - parseDate(b.purchaseDate).getTime(),
      );
      break;
    case 'LIFO':
      orderedLots = [...lots].sort(
        (a, b) => parseDate(b.purchaseDate).getTime() - parseDate(a.purchaseDate).getTime(),
      );
      break;
    case 'SPECIFIC_ID':
      if (!specificLotIds || specificLotIds.length === 0) {
        return { selectedLots: [], totalCostBasis: 0 };
      }
      orderedLots = specificLotIds
        .map((id) => lots.find((l) => l.id === id))
        .filter((l): l is Lot => l !== undefined);
      break;
    case 'AVERAGE_COST':
      // Average cost treats all lots equally; order doesn't matter
      orderedLots = lots;
      break;
    default:
      orderedLots = lots;
  }

  if (method === 'AVERAGE_COST') {
    const totalShares = lots.reduce((sum, l) => sum + l.shares, 0);
    const totalCost = lots.reduce((sum, l) => sum + l.totalCost.amount, 0);
    const avgCostPerShare = totalShares > 0 ? totalCost / totalShares : 0;
    const effectiveShares = Math.min(sharesToSell, totalShares);
    const totalCostBasis = Math.round(effectiveShares * avgCostPerShare);

    return {
      selectedLots: lots.map((lot) => ({
        lot,
        sharesToSell: Math.min(lot.shares, (lot.shares / totalShares) * effectiveShares),
      })),
      totalCostBasis,
    };
  }

  const selectedLots: Array<{ lot: Lot; sharesToSell: number }> = [];
  let remaining = sharesToSell;
  let totalCostBasis = 0;

  for (const lot of orderedLots) {
    if (remaining <= 0) break;

    const sellFromLot = Math.min(remaining, lot.shares);
    selectedLots.push({ lot, sharesToSell: sellFromLot });
    totalCostBasis += Math.round(sellFromLot * lot.costPerShare.amount);
    remaining -= sellFromLot;
  }

  return { selectedLots, totalCostBasis };
}

// ---------------------------------------------------------------------------
// Average cost basis
// ---------------------------------------------------------------------------

/**
 * Compute the average cost per share across all lots.
 *
 * @param lots - All lots for a single position.
 * @returns Average cost per share in cents, or 0 if no lots.
 */
export function computeAverageCostBasis(lots: readonly Lot[]): Cents {
  const totalShares = lots.reduce((sum, l) => sum + l.shares, 0);
  const totalCost = lots.reduce((sum, l) => sum + l.totalCost.amount, 0);

  if (totalShares === 0) {
    return { amount: 0 };
  }

  return { amount: Math.round(totalCost / totalShares) };
}

// ---------------------------------------------------------------------------
// Wash sale detection
// ---------------------------------------------------------------------------

/** The IRS wash sale window in days. */
const WASH_SALE_WINDOW_DAYS = 30;

/**
 * Detect potential wash sales for a symbol.
 *
 * A wash sale occurs when a security is sold at a loss and a substantially
 * identical security is purchased within 30 days before or after the sale.
 *
 * This is a simplified detection that checks lot purchase dates against
 * sale dates. It does NOT handle all IRS edge cases (e.g., options, related
 * securities, partial wash sales).
 *
 * @param soldLots - Lots that were sold (with sale date and realized loss).
 * @param allLots - All lots (including new purchases) for the same symbol.
 * @param symbol - The ticker symbol.
 * @returns Array of wash sale alerts.
 */
export function detectWashSales(
  soldLots: ReadonlyArray<{
    lotId: string;
    soldDate: LocalDate;
    realizedLoss: number;
  }>,
  allLots: readonly Lot[],
  symbol: string,
): WashSaleAlert[] {
  const alerts: WashSaleAlert[] = [];

  for (const sold of soldLots) {
    // Only check sales that resulted in a loss
    if (sold.realizedLoss >= 0) continue;

    const soldDate = parseDate(sold.soldDate);

    for (const lot of allLots) {
      if (lot.id === sold.lotId) continue;

      const purchaseDate = parseDate(lot.purchaseDate);
      const daysDiff = Math.abs(
        (purchaseDate.getTime() - soldDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff <= WASH_SALE_WINDOW_DAYS) {
        alerts.push({
          lotId: sold.lotId,
          symbol,
          soldDate: sold.soldDate,
          replacementDate: lot.purchaseDate,
          disallowedLoss: Math.abs(sold.realizedLoss),
        });
        break; // One alert per sold lot
      }
    }
  }

  return alerts;
}
