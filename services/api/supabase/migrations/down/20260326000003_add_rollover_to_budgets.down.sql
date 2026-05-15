-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260326000003_add_rollover_to_budgets
-- Description: Remove is_rollover column from budgets
-- Issues: #1322
--
-- Reverts the is_rollover boolean column. Any rollover configuration will be lost.

ALTER TABLE budgets DROP COLUMN IF EXISTS is_rollover;
