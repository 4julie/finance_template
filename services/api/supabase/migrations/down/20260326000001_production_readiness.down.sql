-- SPDX-License-Identifier: BUSL-1.1

-- DOWN Migration: 20260326000001_production_readiness
-- Description: Drop production readiness verification functions
-- Issues: #1322
--
-- Reverts: verify_rls_status(), verify_schema_integrity(), production_health_summary()
-- These are diagnostic functions with no schema dependencies — safe to drop.

DROP FUNCTION IF EXISTS public.production_health_summary();
DROP FUNCTION IF EXISTS public.verify_schema_integrity();
DROP FUNCTION IF EXISTS public.verify_rls_status();
