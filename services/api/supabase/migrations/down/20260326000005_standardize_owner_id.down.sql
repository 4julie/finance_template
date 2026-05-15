-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260326000005_standardize_owner_id
-- Description: Remove owner_id from all sync-enabled tables
-- Issues: #1322
--
-- Reverts owner_id columns, indexes, and owner-based SELECT RLS policies.
-- Must be run IN ORDER: policies first, then indexes, then columns.

-- 1. Drop owner-based SELECT policies
DROP POLICY IF EXISTS recurring_templates_select_owner ON recurring_transaction_templates;
DROP POLICY IF EXISTS goals_select_owner ON goals;
DROP POLICY IF EXISTS budgets_select_owner ON budgets;
DROP POLICY IF EXISTS transactions_select_owner ON transactions;
DROP POLICY IF EXISTS categories_select_owner ON categories;
DROP POLICY IF EXISTS accounts_select_owner ON accounts;

-- 2. Drop indexes
DROP INDEX IF EXISTS idx_recurring_templates_owner;
DROP INDEX IF EXISTS idx_goals_owner;
DROP INDEX IF EXISTS idx_budgets_owner;
DROP INDEX IF EXISTS idx_transactions_owner;
DROP INDEX IF EXISTS idx_categories_owner;
DROP INDEX IF EXISTS idx_accounts_owner;

-- 3. Drop columns
ALTER TABLE recurring_transaction_templates DROP COLUMN IF EXISTS owner_id;
ALTER TABLE goals DROP COLUMN IF EXISTS owner_id;
ALTER TABLE budgets DROP COLUMN IF EXISTS owner_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS owner_id;
ALTER TABLE categories DROP COLUMN IF EXISTS owner_id;
ALTER TABLE accounts DROP COLUMN IF EXISTS owner_id;
