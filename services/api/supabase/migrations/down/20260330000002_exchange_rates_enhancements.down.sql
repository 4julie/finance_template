-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260330000002_exchange_rates_enhancements
-- Description: Revert historical rate support, staleness tracking, and fallback strategy
-- Issues: #1127

-- Drop new indexes
DROP INDEX IF EXISTS idx_exchange_rates_conversion_lookup;
DROP INDEX IF EXISTS idx_exchange_rates_historical;

-- Remove source_status column
ALTER TABLE exchange_rates DROP COLUMN IF EXISTS source_status;
