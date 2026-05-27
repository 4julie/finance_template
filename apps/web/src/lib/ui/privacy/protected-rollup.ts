// SPDX-License-Identifier: BUSL-1.1

import type { Category, Transaction } from '../../../kmp/bridge';

/** Redacted aggregate replacing protected category details on non-detail surfaces. */
export interface ProtectedRollup {
  readonly label: 'Protected';
  readonly count: number;
  readonly totalCents: number;
  readonly currency: string;
}

/** Split visible transactions from biometric-protected category transactions. */
export function rollUpProtectedTransactions(
  transactions: readonly Transaction[],
  categories: readonly Pick<Category, 'id' | 'isBiometricProtected'>[],
): { visibleTransactions: Transaction[]; protectedRollup: ProtectedRollup | null } {
  const protectedIds = new Set(
    categories.filter((category) => category.isBiometricProtected).map((category) => category.id),
  );
  const visibleTransactions: Transaction[] = [];
  let count = 0;
  let totalCents = 0;
  let currency = 'USD';

  for (const transaction of transactions) {
    if (transaction.categoryId !== null && protectedIds.has(transaction.categoryId)) {
      count += 1;
      totalCents += Math.abs(transaction.amount.amount);
      currency = transaction.currency.code;
    } else {
      visibleTransactions.push(transaction);
    }
  }

  return {
    visibleTransactions,
    protectedRollup:
      count > 0
        ? {
            label: 'Protected',
            count,
            totalCents,
            currency,
          }
        : null,
  };
}

/** Remove protected categories before any household, partner, or caregiver sharing payload. */
export function excludeProtectedCategoriesForSharing<T extends { categoryId: string | null }>(
  items: readonly T[],
  protectedCategoryIds: ReadonlySet<string>,
): T[] {
  return items.filter(
    (item) => item.categoryId === null || !protectedCategoryIds.has(item.categoryId),
  );
}

/** Return only categories that may be synced or shown to another person. */
export function shareableCategories<T extends { id: string; isBiometricProtected?: boolean }>(
  categories: readonly T[],
): T[] {
  return categories.filter((category) => category.isBiometricProtected !== true);
}
