// SPDX-License-Identifier: BUSL-1.1

/**
 * Investment screener filter evaluation engine.
 *
 * Provides filter matching, multi-filter AND logic, and sort/rank functions
 * for screening securities by fundamental data.
 *
 * All monetary values are integer cents.
 *
 * References: issue #1740
 */

import { styleBoxKey } from './style-box';
import {
  FilterOperator,
  type NumericFilter,
  type ScreenableAsset,
  type ScreenerFilters,
  type ScreenerSort,
  SortDirection,
} from './types';

// ---------------------------------------------------------------------------
// Numeric filter evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a numeric filter against a value.
 *
 * @param value - The value to test. Null values always fail the filter.
 * @param filter - The numeric filter criteria.
 * @returns True if the value passes the filter.
 */
export function evaluateNumericFilter(value: number | null, filter: NumericFilter): boolean {
  if (value === null) return false;

  switch (filter.operator) {
    case FilterOperator.EQ:
      return value === filter.value;
    case FilterOperator.NEQ:
      return value !== filter.value;
    case FilterOperator.GT:
      return value > filter.value;
    case FilterOperator.GTE:
      return value >= filter.value;
    case FilterOperator.LT:
      return value < filter.value;
    case FilterOperator.LTE:
      return value <= filter.value;
    case FilterOperator.BETWEEN:
      return value >= filter.value && value <= (filter.valueTo ?? filter.value);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Asset filter matching
// ---------------------------------------------------------------------------

/**
 * Check whether a single asset matches all screener filters (AND logic).
 *
 * All specified filters must pass for the asset to match.
 * Unspecified filters are treated as passing.
 *
 * @param asset - The screenable asset to evaluate.
 * @param filters - The screener filter criteria.
 * @returns True if the asset passes all filters.
 */
export function matchesFilters(asset: ScreenableAsset, filters: ScreenerFilters): boolean {
  // P/E ratio filter
  if (filters.peRatio && !evaluateNumericFilter(asset.peRatio, filters.peRatio)) {
    return false;
  }

  // Market cap filter
  if (filters.marketCap && !evaluateNumericFilter(asset.marketCap, filters.marketCap)) {
    return false;
  }

  // Dividend yield filter
  if (filters.dividendYield && !evaluateNumericFilter(asset.dividendYield, filters.dividendYield)) {
    return false;
  }

  // Sector inclusion filter
  if (filters.sectors && filters.sectors.length > 0) {
    if (!filters.sectors.includes(asset.sector)) {
      return false;
    }
  }

  // Style box inclusion filter
  if (filters.styles && filters.styles.length > 0) {
    const assetKey = styleBoxKey(asset.styleBox);
    const matchesStyle = filters.styles.some((s) => styleBoxKey(s) === assetKey);
    if (!matchesStyle) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Screen (filter + sort)
// ---------------------------------------------------------------------------

/**
 * Screen a list of assets using the given filters and optional sort.
 *
 * Applies all filters with AND logic, then sorts the results.
 *
 * @param assets - Array of screenable assets.
 * @param filters - Filter criteria to apply.
 * @param sort - Optional sort specification.
 * @returns Filtered and sorted array of matching assets.
 */
export function screenAssets(
  assets: readonly ScreenableAsset[],
  filters: ScreenerFilters,
  sort?: ScreenerSort,
): readonly ScreenableAsset[] {
  const filtered = assets.filter((a) => matchesFilters(a, filters));

  if (!sort) return filtered;

  return sortAssets(filtered, sort);
}

// ---------------------------------------------------------------------------
// Sort / Rank
// ---------------------------------------------------------------------------

/**
 * Get a comparable numeric value from an asset by field name.
 *
 * @param asset - The asset to extract a value from.
 * @param field - The field name to extract.
 * @returns The numeric value, or null if not applicable.
 */
function getFieldValue(asset: ScreenableAsset, field: string): number | null {
  switch (field) {
    case 'peRatio':
      return asset.peRatio;
    case 'marketCap':
      return asset.marketCap;
    case 'dividendYield':
      return asset.dividendYield;
    case 'symbol':
      return null; // handled separately for string sort
    case 'name':
      return null; // handled separately for string sort
    default:
      return null;
  }
}

/**
 * Get a comparable string value from an asset by field name.
 *
 * @param asset - The asset to extract a value from.
 * @param field - The field name to extract.
 * @returns The string value.
 */
function getStringFieldValue(asset: ScreenableAsset, field: string): string {
  switch (field) {
    case 'symbol':
      return asset.symbol;
    case 'name':
      return asset.name;
    case 'sector':
      return asset.sector;
    default:
      return '';
  }
}

/**
 * Sort an array of assets by a given field and direction.
 *
 * Null values are sorted to the end regardless of direction.
 *
 * @param assets - Array of assets to sort.
 * @param sort - Sort field and direction.
 * @returns New sorted array (does not mutate input).
 */
export function sortAssets(
  assets: readonly ScreenableAsset[],
  sort: ScreenerSort,
): readonly ScreenableAsset[] {
  const { field, direction } = sort;
  const isStringField = field === 'symbol' || field === 'name' || field === 'sector';
  const multiplier = direction === SortDirection.ASC ? 1 : -1;

  return [...assets].sort((a, b) => {
    if (isStringField) {
      const valA = getStringFieldValue(a, field);
      const valB = getStringFieldValue(b, field);
      return multiplier * valA.localeCompare(valB);
    }

    const valA = getFieldValue(a, field);
    const valB = getFieldValue(b, field);

    // Nulls go to end
    if (valA === null && valB === null) return 0;
    if (valA === null) return 1;
    if (valB === null) return -1;

    return multiplier * (valA - valB);
  });
}

/**
 * Rank assets by a numeric field, returning them sorted with rank indices.
 *
 * @param assets - Array of assets to rank.
 * @param field - The numeric field to rank by.
 * @param direction - Sort direction (DESC = highest first, ASC = lowest first).
 * @returns Array of objects with asset and rank (1-based).
 */
export function rankAssets(
  assets: readonly ScreenableAsset[],
  field: string,
  direction: SortDirection = SortDirection.DESC,
): readonly { readonly asset: ScreenableAsset; readonly rank: number }[] {
  const sorted = sortAssets(assets, { field, direction });
  return sorted.map((asset, index) => ({ asset, rank: index + 1 }));
}
