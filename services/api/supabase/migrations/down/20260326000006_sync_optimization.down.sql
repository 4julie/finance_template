-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260326000006_sync_optimization
-- Description: Remove sync optimization objects (schema version, materialized view, updated generate function)
-- Issues: #1322
--
-- Reverts:
--   1. Restores generate_recurring_transactions to the version from 20260323000002
--      (without recurring_rule_id/owner_id population)
--   2. Drops the household financial summary materialized view and refresh function
--   3. Drops the schema version function

-- 4. Restore original generate_recurring_transactions (from 20260323000002)
CREATE OR REPLACE FUNCTION public.generate_recurring_transactions(
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    template RECORD;
    generated_count INTEGER := 0;
    next_date DATE;
BEGIN
    FOR template IN
        SELECT * FROM recurring_transaction_templates
        WHERE deleted_at IS NULL
          AND is_active = true
          AND next_due_date <= p_as_of_date
          AND (end_date IS NULL OR next_due_date <= end_date)
        ORDER BY next_due_date ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        INSERT INTO transactions (
            household_id, account_id, category_id,
            amount_cents, currency_code, type,
            payee, note, date,
            is_recurring, status
        ) VALUES (
            template.household_id, template.account_id, template.category_id,
            template.amount_cents, template.currency_code, template.type,
            template.payee, template.note, template.next_due_date,
            true, 'CLEARED'
        );

        next_date := CASE template.frequency
            WHEN 'daily'     THEN template.next_due_date + INTERVAL '1 day'
            WHEN 'weekly'    THEN template.next_due_date + INTERVAL '1 week'
            WHEN 'biweekly'  THEN template.next_due_date + INTERVAL '2 weeks'
            WHEN 'monthly'   THEN template.next_due_date + INTERVAL '1 month'
            WHEN 'quarterly' THEN template.next_due_date + INTERVAL '3 months'
            WHEN 'yearly'    THEN template.next_due_date + INTERVAL '1 year'
        END;

        IF template.end_date IS NOT NULL AND next_date > template.end_date THEN
            UPDATE recurring_transaction_templates
            SET is_active = false,
                last_generated_date = template.next_due_date
            WHERE id = template.id;
        ELSE
            UPDATE recurring_transaction_templates
            SET last_generated_date = template.next_due_date,
                next_due_date = next_date
            WHERE id = template.id;
        END IF;

        generated_count := generated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'generated_count', generated_count,
        'as_of_date', p_as_of_date,
        'generated_at', now()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_recurring_transactions(DATE) TO service_role;
REVOKE EXECUTE ON FUNCTION public.generate_recurring_transactions(DATE) FROM PUBLIC;

-- 3. Drop refresh function
DROP FUNCTION IF EXISTS public.refresh_household_summary();

-- 2. Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS household_financial_summary;

-- 1. Drop schema version function
DROP FUNCTION IF EXISTS public.get_schema_version();
