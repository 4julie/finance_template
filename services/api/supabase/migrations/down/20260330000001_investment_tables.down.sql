-- SPDX-License-Identifier: BUSL-1.1
-- DOWN Migration: 20260330000001_investment_tables

DROP POLICY IF EXISTS report_templates_delete ON report_templates;
DROP POLICY IF EXISTS report_templates_update ON report_templates;
DROP POLICY IF EXISTS report_templates_insert ON report_templates;
DROP POLICY IF EXISTS report_templates_select ON report_templates;
ALTER TABLE report_templates DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_report_templates_updated_at ON report_templates;
DROP TABLE IF EXISTS report_templates;

DROP POLICY IF EXISTS bill_reminders_delete ON bill_reminders;
DROP POLICY IF EXISTS bill_reminders_update ON bill_reminders;
DROP POLICY IF EXISTS bill_reminders_insert ON bill_reminders;
DROP POLICY IF EXISTS bill_reminders_select ON bill_reminders;
ALTER TABLE bill_reminders DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_bill_reminders_updated_at ON bill_reminders;
DROP TABLE IF EXISTS bill_reminders;

DROP POLICY IF EXISTS price_history_delete ON price_history;
DROP POLICY IF EXISTS price_history_update ON price_history;
DROP POLICY IF EXISTS price_history_insert ON price_history;
DROP POLICY IF EXISTS price_history_select ON price_history;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_price_history_updated_at ON price_history;
DROP TABLE IF EXISTS price_history;

DROP POLICY IF EXISTS investment_holdings_delete ON investment_holdings;
DROP POLICY IF EXISTS investment_holdings_update ON investment_holdings;
DROP POLICY IF EXISTS investment_holdings_insert ON investment_holdings;
DROP POLICY IF EXISTS investment_holdings_select ON investment_holdings;
ALTER TABLE investment_holdings DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_investment_holdings_updated_at ON investment_holdings;
DROP TABLE IF EXISTS investment_holdings;

DROP POLICY IF EXISTS investment_portfolios_delete ON investment_portfolios;
DROP POLICY IF EXISTS investment_portfolios_update ON investment_portfolios;
DROP POLICY IF EXISTS investment_portfolios_insert ON investment_portfolios;
DROP POLICY IF EXISTS investment_portfolios_select ON investment_portfolios;
ALTER TABLE investment_portfolios DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS trg_investment_portfolios_updated_at ON investment_portfolios;
DROP TABLE IF EXISTS investment_portfolios;

