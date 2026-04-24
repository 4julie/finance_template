-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260327000004_anomaly_detection
-- Description: Drop anomaly detection tables, rules, and functions
-- Issues: #323

-- Drop triggers
DROP TRIGGER IF EXISTS trg_anomaly_alerts_updated_at ON anomaly_alerts;
DROP TRIGGER IF EXISTS trg_anomaly_rules_updated_at ON anomaly_rules;

-- Drop RLS policies
DROP POLICY IF EXISTS anomaly_alerts_update ON anomaly_alerts;
DROP POLICY IF EXISTS anomaly_alerts_select ON anomaly_alerts;
DROP POLICY IF EXISTS anomaly_rules_delete ON anomaly_rules;
DROP POLICY IF EXISTS anomaly_rules_update ON anomaly_rules;
DROP POLICY IF EXISTS anomaly_rules_insert ON anomaly_rules;
DROP POLICY IF EXISTS anomaly_rules_select ON anomaly_rules;

-- Disable RLS
ALTER TABLE anomaly_alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_rules DISABLE ROW LEVEL SECURITY;

-- Drop function
DROP FUNCTION IF EXISTS public.detect_transaction_anomalies(UUID);

-- Drop tables (alerts first due to FK to rules)
DROP TABLE IF EXISTS anomaly_alerts;
DROP TABLE IF EXISTS anomaly_rules;
