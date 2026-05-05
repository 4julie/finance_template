-- SPDX-License-Identifier: BUSL-1.1

-- Migration: 20260330000002_exchange_rates_enhancements
-- Description: Add historical rate support, staleness tracking, and fallback strategy to exchange_rates
-- Issues: #1127
--
-- Enhancements:
--   - Index for historical date-range lookups (rates on or before a given date)
--   - source_status column for tracking provider availability
--   - Comment updates for new query patterns
--
-- DOWN migration: services/api/supabase/migrations/down/20260330000002_exchange_rates_enhancements.down.sql

-- =============================================================================
-- UP
-- =============================================================================

-- Index for historical lookups: find rates on or before a specific date per currency pair.
-- Supports queries like: WHERE target_currency = 'USD' AND valid_date <= '2025-01-15' ORDER BY valid_date DESC LIMIT 1
CREATE INDEX IF NOT EXISTS idx_exchange_rates_historical
    ON exchange_rates (target_currency, valid_date DESC)
    WHERE deleted_at IS NULL AND base_currency = 'EUR';

-- Track provider fetch status for fallback strategy.
-- 'live' = fetched from provider in the current window.
-- 'cached' = using a previously cached rate (provider was unavailable).
-- 'fallback' = using an older rate because no rate exists for this date.
ALTER TABLE exchange_rates
    ADD COLUMN IF NOT EXISTS source_status TEXT NOT NULL DEFAULT 'live'
    CHECK (source_status IN ('live', 'cached', 'fallback'));

COMMENT ON COLUMN exchange_rates.source_status IS
    'Provider fetch status: live (fresh from ECB), cached (reused from DB), fallback (older rate used when provider unavailable).';

-- Composite index for the conversion endpoint: lookup a specific pair by date
CREATE INDEX IF NOT EXISTS idx_exchange_rates_conversion_lookup
    ON exchange_rates (base_currency, target_currency, valid_date DESC)
    WHERE deleted_at IS NULL;
