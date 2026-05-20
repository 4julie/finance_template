// SPDX-License-Identifier: BUSL-1.1

/**
 * Economic calendar event filtering and querying.
 *
 * Provides date-based filtering, type-based filtering, and upcoming event
 * queries for earnings, dividends, splits, Fed meetings, and other events.
 *
 * References: issue #1740
 */

import type { EconomicEvent, EconomicEventType } from './types';

// ---------------------------------------------------------------------------
// Date range filtering
// ---------------------------------------------------------------------------

/**
 * Filter events that fall within a date range (inclusive).
 *
 * @param events - Array of economic events to filter.
 * @param startDate - Start date (ISO 8601, YYYY-MM-DD). Inclusive.
 * @param endDate - End date (ISO 8601, YYYY-MM-DD). Inclusive.
 * @returns Events within the date range, sorted by date ascending.
 */
export function filterEventsByDateRange(
  events: readonly EconomicEvent[],
  startDate: string,
  endDate: string,
): readonly EconomicEvent[] {
  return events
    .filter((e) => e.date >= startDate && e.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Type filtering
// ---------------------------------------------------------------------------

/**
 * Filter events by one or more event types.
 *
 * @param events - Array of economic events to filter.
 * @param types - Event types to include.
 * @returns Events matching any of the specified types.
 */
export function filterEventsByType(
  events: readonly EconomicEvent[],
  types: readonly EconomicEventType[],
): readonly EconomicEvent[] {
  const typeSet = new Set(types);
  return events.filter((e) => typeSet.has(e.type));
}

// ---------------------------------------------------------------------------
// Symbol filtering
// ---------------------------------------------------------------------------

/**
 * Filter events related to a specific ticker symbol.
 *
 * @param events - Array of economic events to filter.
 * @param symbol - The ticker symbol to filter by (case-insensitive).
 * @returns Events related to the specified symbol.
 */
export function filterEventsBySymbol(
  events: readonly EconomicEvent[],
  symbol: string,
): readonly EconomicEvent[] {
  const upper = symbol.toUpperCase();
  return events.filter((e) => e.symbol?.toUpperCase() === upper);
}

// ---------------------------------------------------------------------------
// Upcoming events query
// ---------------------------------------------------------------------------

/**
 * Get upcoming events from a reference date, limited by count.
 *
 * @param events - Array of economic events.
 * @param referenceDate - The reference date (ISO 8601, YYYY-MM-DD). Events on or after this date are included.
 * @param limit - Maximum number of events to return (default: 10).
 * @returns Up to `limit` upcoming events sorted by date ascending.
 */
export function getUpcomingEvents(
  events: readonly EconomicEvent[],
  referenceDate: string,
  limit: number = 10,
): readonly EconomicEvent[] {
  return events
    .filter((e) => e.date >= referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Combined filtering
// ---------------------------------------------------------------------------

/**
 * Filter events by multiple criteria simultaneously.
 *
 * All specified criteria must be satisfied (AND logic).
 * Omitted criteria are ignored.
 *
 * @param events - Array of economic events.
 * @param criteria - Filter criteria object.
 * @returns Filtered events sorted by date ascending.
 */
export function filterEvents(
  events: readonly EconomicEvent[],
  criteria: {
    readonly startDate?: string;
    readonly endDate?: string;
    readonly types?: readonly EconomicEventType[];
    readonly symbol?: string;
  },
): readonly EconomicEvent[] {
  let result = [...events];

  if (criteria.startDate) {
    result = result.filter((e) => e.date >= criteria.startDate!);
  }

  if (criteria.endDate) {
    result = result.filter((e) => e.date <= criteria.endDate!);
  }

  if (criteria.types && criteria.types.length > 0) {
    const typeSet = new Set(criteria.types);
    result = result.filter((e) => typeSet.has(e.type));
  }

  if (criteria.symbol) {
    const upper = criteria.symbol.toUpperCase();
    result = result.filter((e) => e.symbol?.toUpperCase() === upper);
  }

  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}
