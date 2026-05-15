-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260326000002_add_transfer_recurring_to_transactions
-- Description: Remove transfer_transaction_id and recurring_rule_id from transactions
-- Issues: #1322
--
-- Reverts the two new nullable FK columns and their indexes.
-- Data in these columns will be lost on rollback.

DROP INDEX IF EXISTS idx_transactions_recurring_rule;
DROP INDEX IF EXISTS idx_transactions_transfer_pair;
ALTER TABLE transactions DROP COLUMN IF EXISTS recurring_rule_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS transfer_transaction_id;
