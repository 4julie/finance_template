// SPDX-License-Identifier: BUSL-1.1

import { describe, expect, it } from 'vitest';
import type { Category, Transaction } from '../../../../kmp/bridge';
import {
  excludeProtectedCategoriesForSharing,
  rollUpProtectedTransactions,
  shareableCategories,
} from '../protected-rollup';

const baseSync = {
  householdId: 'household-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  deletedAt: null,
  syncVersion: 1,
  isSynced: false,
};

function category(id: string, isBiometricProtected: boolean): Category {
  return {
    ...baseSync,
    id,
    name: id,
    icon: null,
    color: null,
    parentId: null,
    isIncome: false,
    isSystem: false,
    sortOrder: 0,
    isBiometricProtected,
  };
}

function transaction(id: string, categoryId: string | null, amount: number): Transaction {
  return {
    ...baseSync,
    id,
    accountId: 'acct-1',
    categoryId,
    type: 'EXPENSE',
    status: 'CLEARED',
    amount: { amount },
    currency: { code: 'USD', decimalPlaces: 2 },
    payee: `Payee ${id}`,
    note: `Note ${id}`,
    date: '2026-01-01',
    transferAccountId: null,
    transferTransactionId: null,
    isRecurring: false,
    recurringRuleId: null,
    tags: [],
    merchantAddress: null,
    merchantCity: null,
    merchantState: null,
    merchantZip: null,
    merchantCountry: null,
    externalReferenceId: null,
    statementDescription: null,
    customFields: null,
    extraNotes: null,
    counterpartyName: null,
    counterpartyAccountId: null,
  };
}

describe('protected category roll-up', () => {
  it('hides protected category transactions individually and replaces them with one aggregate', () => {
    const result = rollUpProtectedTransactions(
      [
        transaction('visible', 'food', 1200),
        transaction('secret-1', 'medical', 5000),
        transaction('secret-2', 'medical', 7000),
      ],
      [category('food', false), category('medical', true)],
    );

    expect(result.visibleTransactions.map((item) => item.id)).toEqual(['visible']);
    expect(result.protectedRollup).toEqual({
      label: 'Protected',
      count: 2,
      totalCents: 12000,
      currency: 'USD',
    });
  });

  it('excludes protected data from household, partner, and caregiver payloads regardless of privacy mode', () => {
    const protectedIds = new Set(['medical']);
    const items = [transaction('visible', 'food', 1200), transaction('secret', 'medical', 5000)];

    expect(
      excludeProtectedCategoriesForSharing(items, protectedIds).map((item) => item.id),
    ).toEqual(['visible']);
    expect(
      shareableCategories([category('food', false), category('medical', true)]).map(
        (item) => item.id,
      ),
    ).toEqual(['food']);
  });
});
