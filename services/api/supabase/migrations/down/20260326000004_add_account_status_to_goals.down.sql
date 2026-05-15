-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260326000004_add_account_status_to_goals
-- Description: Remove account_id and status columns from goals
-- Issues: #1322
--
-- Reverts the account_id FK, status enum column, CHECK constraint, and indexes.
-- Goal-to-account links and lifecycle status will be lost on rollback.

DROP INDEX IF EXISTS idx_goals_status;
DROP INDEX IF EXISTS idx_goals_account;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS chk_goals_status;
ALTER TABLE goals DROP COLUMN IF EXISTS status;
ALTER TABLE goals DROP COLUMN IF EXISTS account_id;
