-- SPDX-License-Identifier: BUSL-1.1

-- Migration: 20260327000004_anomaly_detection
-- Description: Anomaly detection rules and alert tables for unusual transactions
-- Issues: #323
--
-- Adds:
--   1. anomaly_rules — configurable detection rules per household
--   2. anomaly_alerts — detected anomalies awaiting review
--   3. detect_transaction_anomalies() — function that evaluates rules
--
-- Security:
--   - RLS enabled on all tables with household isolation
--   - Alerts reference transaction IDs but NEVER store amounts/descriptions
--   - Detection function is service_role only
--
-- DOWN migration: at the bottom and in down/ directory.

-- =============================================================================
-- 1. anomaly_rules
-- =============================================================================
-- Configurable detection rules. Each rule defines a condition that triggers
-- an anomaly alert when matched.

CREATE TABLE anomaly_rules (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID        NOT NULL REFERENCES households(id),
    owner_id        UUID        NOT NULL REFERENCES auth.users(id),
    name            TEXT        NOT NULL,
    description     TEXT,
    rule_type       TEXT        NOT NULL
                    CONSTRAINT  anomaly_rules_type_valid
                        CHECK (rule_type IN (
                            'amount_threshold',
                            'std_deviation',
                            'duplicate_detection',
                            'unusual_category',
                            'frequency_spike',
                            'time_of_day'
                        )),
    -- Rule configuration as JSONB — schema varies by rule_type
    -- amount_threshold: { threshold_cents: BIGINT, direction: 'above'|'below' }
    -- std_deviation: { multiplier: NUMERIC, lookback_days: INTEGER }
    -- duplicate_detection: { time_window_hours: INTEGER, amount_tolerance_cents: BIGINT }
    -- unusual_category: { category_ids: UUID[], lookback_days: INTEGER }
    -- frequency_spike: { multiplier: NUMERIC, lookback_days: INTEGER }
    -- time_of_day: { start_hour: INTEGER, end_hour: INTEGER }
    config          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    is_active       BOOLEAN     NOT NULL DEFAULT true,
    severity        TEXT        NOT NULL DEFAULT 'medium'
                    CONSTRAINT  anomaly_rules_severity_valid
                        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    -- Standard columns
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,
    sync_version    BIGINT      NOT NULL DEFAULT 0,
    is_synced       BOOLEAN     NOT NULL DEFAULT false
);

CREATE INDEX idx_anomaly_rules_household
    ON anomaly_rules (household_id)
    WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX idx_anomaly_rules_type
    ON anomaly_rules (rule_type)
    WHERE deleted_at IS NULL AND is_active = true;

COMMENT ON TABLE anomaly_rules IS
    'Configurable anomaly detection rules per household. Each rule defines a '
    'condition that triggers alerts when matched against new transactions.';

-- =============================================================================
-- 2. anomaly_alerts
-- =============================================================================
-- Stores detected anomalies for user review. References transactions by ID
-- but NEVER stores the actual amount or description.

CREATE TABLE anomaly_alerts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID        NOT NULL REFERENCES households(id),
    rule_id         UUID        NOT NULL REFERENCES anomaly_rules(id),
    transaction_id  UUID        NOT NULL REFERENCES transactions(id),
    alert_type      TEXT        NOT NULL,
    severity        TEXT        NOT NULL DEFAULT 'medium'
                    CONSTRAINT  anomaly_alerts_severity_valid
                        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    -- Summary metadata — no raw financial data
    summary         TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'pending'
                    CONSTRAINT  anomaly_alerts_status_valid
                        CHECK (status IN ('pending', 'reviewed', 'dismissed', 'confirmed')),
    reviewed_by     UUID        REFERENCES auth.users(id),
    reviewed_at     TIMESTAMPTZ,
    -- Standard columns
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_anomaly_alerts_household
    ON anomaly_alerts (household_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_anomaly_alerts_status
    ON anomaly_alerts (status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_anomaly_alerts_transaction
    ON anomaly_alerts (transaction_id)
    WHERE deleted_at IS NULL;

COMMENT ON TABLE anomaly_alerts IS
    'Detected transaction anomalies awaiting user review. References transaction '
    'IDs but NEVER stores raw financial data (amounts, descriptions).';

-- =============================================================================
-- 3. detect_transaction_anomalies()
-- =============================================================================
-- Evaluates active anomaly rules against a specific transaction.
-- Returns a JSONB array of triggered alerts.

CREATE OR REPLACE FUNCTION public.detect_transaction_anomalies(
    p_transaction_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_txn RECORD;
    v_rule RECORD;
    v_alerts jsonb := '[]'::jsonb;
    v_alert jsonb;
    v_avg_amount NUMERIC;
    v_std_amount NUMERIC;
    v_threshold BIGINT;
    v_duplicate_count BIGINT;
    v_recent_count BIGINT;
    v_avg_count NUMERIC;
BEGIN
    -- Fetch the transaction
    SELECT t.*, c.name AS category_name
    INTO v_txn
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id AND c.deleted_at IS NULL
    WHERE t.id = p_transaction_id AND t.deleted_at IS NULL;

    IF v_txn IS NULL THEN
        RETURN jsonb_build_object('error', 'Transaction not found', 'alerts', '[]'::jsonb);
    END IF;

    -- Evaluate each active rule for the household
    FOR v_rule IN
        SELECT * FROM anomaly_rules
        WHERE household_id = v_txn.household_id
          AND is_active = true
          AND deleted_at IS NULL
    LOOP
        v_alert := NULL;

        -- Amount threshold rule
        IF v_rule.rule_type = 'amount_threshold' THEN
            v_threshold := (v_rule.config->>'threshold_cents')::BIGINT;
            IF v_threshold IS NOT NULL AND ABS(v_txn.amount_cents) > v_threshold THEN
                v_alert := jsonb_build_object(
                    'rule_id', v_rule.id,
                    'alert_type', 'amount_threshold',
                    'severity', v_rule.severity,
                    'summary', 'Transaction exceeds configured amount threshold'
                );
            END IF;
        END IF;

        -- Standard deviation rule
        IF v_rule.rule_type = 'std_deviation' THEN
            SELECT AVG(ABS(amount_cents))::NUMERIC, STDDEV(ABS(amount_cents))::NUMERIC
            INTO v_avg_amount, v_std_amount
            FROM transactions
            WHERE household_id = v_txn.household_id
              AND deleted_at IS NULL
              AND date >= (CURRENT_DATE - ((v_rule.config->>'lookback_days')::INTEGER || ' days')::INTERVAL)::DATE
              AND id != p_transaction_id
              AND (v_txn.category_id IS NULL OR category_id = v_txn.category_id);

            IF v_std_amount IS NOT NULL AND v_std_amount > 0 THEN
                IF ABS(v_txn.amount_cents) > (v_avg_amount + (v_rule.config->>'multiplier')::NUMERIC * v_std_amount) THEN
                    v_alert := jsonb_build_object(
                        'rule_id', v_rule.id,
                        'alert_type', 'std_deviation',
                        'severity', v_rule.severity,
                        'summary', 'Transaction amount is statistically unusual'
                    );
                END IF;
            END IF;
        END IF;

        -- Duplicate detection rule
        IF v_rule.rule_type = 'duplicate_detection' THEN
            SELECT count(*) INTO v_duplicate_count
            FROM transactions
            WHERE household_id = v_txn.household_id
              AND deleted_at IS NULL
              AND id != p_transaction_id
              AND ABS(amount_cents - v_txn.amount_cents) <= COALESCE((v_rule.config->>'amount_tolerance_cents')::BIGINT, 0)
              AND payee = v_txn.payee
              AND created_at >= (now() - ((v_rule.config->>'time_window_hours')::INTEGER || ' hours')::INTERVAL);

            IF v_duplicate_count > 0 THEN
                v_alert := jsonb_build_object(
                    'rule_id', v_rule.id,
                    'alert_type', 'duplicate_detection',
                    'severity', v_rule.severity,
                    'summary', 'Possible duplicate transaction detected'
                );
            END IF;
        END IF;

        -- Frequency spike rule
        IF v_rule.rule_type = 'frequency_spike' THEN
            SELECT count(*) INTO v_recent_count
            FROM transactions
            WHERE household_id = v_txn.household_id
              AND deleted_at IS NULL
              AND date >= CURRENT_DATE - 1;

            SELECT (count(*)::NUMERIC / GREATEST(1, (v_rule.config->>'lookback_days')::INTEGER))
            INTO v_avg_count
            FROM transactions
            WHERE household_id = v_txn.household_id
              AND deleted_at IS NULL
              AND date >= (CURRENT_DATE - ((v_rule.config->>'lookback_days')::INTEGER || ' days')::INTERVAL)::DATE;

            IF v_avg_count > 0 AND v_recent_count > (v_avg_count * (v_rule.config->>'multiplier')::NUMERIC) THEN
                v_alert := jsonb_build_object(
                    'rule_id', v_rule.id,
                    'alert_type', 'frequency_spike',
                    'severity', v_rule.severity,
                    'summary', 'Unusual spike in transaction frequency'
                );
            END IF;
        END IF;

        IF v_alert IS NOT NULL THEN
            v_alerts := v_alerts || v_alert;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'transaction_id', p_transaction_id,
        'alerts_count', jsonb_array_length(v_alerts),
        'alerts', v_alerts,
        'evaluated_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.detect_transaction_anomalies(UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION public.detect_transaction_anomalies(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.detect_transaction_anomalies(UUID) FROM anon;

COMMENT ON FUNCTION public.detect_transaction_anomalies(UUID) IS
    'Evaluates active anomaly rules against a transaction. Returns triggered alerts. '
    'Service_role only. Alert summaries NEVER contain raw financial data.';

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE anomaly_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;

-- anomaly_rules: household members can read, owners/admins can manage
CREATE POLICY anomaly_rules_select ON anomaly_rules
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY anomaly_rules_insert ON anomaly_rules
    FOR INSERT WITH CHECK (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY anomaly_rules_update ON anomaly_rules
    FOR UPDATE USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY anomaly_rules_delete ON anomaly_rules
    FOR DELETE USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
              AND role IN ('owner', 'admin')
        )
    );

-- anomaly_alerts: household members can read and update status
CREATE POLICY anomaly_alerts_select ON anomaly_alerts
    FOR SELECT USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

CREATE POLICY anomaly_alerts_update ON anomaly_alerts
    FOR UPDATE USING (
        household_id IN (
            SELECT household_id FROM household_members
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
    );

-- Alerts are created by service_role (detection function), not end users

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER trg_anomaly_rules_updated_at
    BEFORE UPDATE ON anomaly_rules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_anomaly_alerts_updated_at
    BEFORE UPDATE ON anomaly_alerts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- DOWN (to revert, run these statements)
-- =============================================================================
-- DROP TRIGGER IF EXISTS trg_anomaly_alerts_updated_at ON anomaly_alerts;
-- DROP TRIGGER IF EXISTS trg_anomaly_rules_updated_at ON anomaly_rules;
-- DROP POLICY IF EXISTS anomaly_alerts_update ON anomaly_alerts;
-- DROP POLICY IF EXISTS anomaly_alerts_select ON anomaly_alerts;
-- DROP POLICY IF EXISTS anomaly_rules_delete ON anomaly_rules;
-- DROP POLICY IF EXISTS anomaly_rules_update ON anomaly_rules;
-- DROP POLICY IF EXISTS anomaly_rules_insert ON anomaly_rules;
-- DROP POLICY IF EXISTS anomaly_rules_select ON anomaly_rules;
-- ALTER TABLE anomaly_alerts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE anomaly_rules DISABLE ROW LEVEL SECURITY;
-- DROP FUNCTION IF EXISTS public.detect_transaction_anomalies(UUID);
-- DROP TABLE IF EXISTS anomaly_alerts;
-- DROP TABLE IF EXISTS anomaly_rules;
