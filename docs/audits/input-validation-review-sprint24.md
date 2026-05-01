# Input Validation Review - Sprint 24

**Date:** 2025-07-27
**Standard:** OWASP MASVS-PLATFORM, SANS Top 25

## Summary: 0 CRITICAL, 1 HIGH, 3 MEDIUM, 2 LOW

## Parameterized Queries: PASS

All web DB repositories (transactions.ts, accounts.ts, categories.ts, etc.) use parameterized queries via db.execute(sql, [params]). No string concatenation for SQL. This is the single most important finding - SQL injection risk is properly mitigated.

## HIGH-1: CSV Import Formula Injection

- **File:** services/api/supabase/functions/import-data/index.ts
- **Severity:** HIGH
- CSV import does not sanitize cell values starting with =, +, -, @ which can cause formula injection when re-exported to Excel/Sheets.
- **Remediation:** Strip or escape formula-triggering prefixes on import.

## MEDIUM-1: LIKE Wildcard Not Escaped

- **File:** apps/web/src/db/repositories/helpers.ts line 114-116
- **Severity:** MEDIUM
- createLikePattern() wraps user input in %...% but does not escape SQL LIKE wildcards (% and \_). Users can craft unexpected search patterns. Not SQL injection (parameterized), but information disclosure risk.
- **Remediation:** Escape % and \_ with backslash before wrapping.

## MEDIUM-2: Consent Management Error Reflection

- **File:** services/api/supabase/functions/consent-management/index.ts line 65
- **Severity:** MEDIUM
- User-provided consent_type reflected in error message without sanitization.
- **Remediation:** Use allowlist validation, return generic error.

## MEDIUM-3: Data Export Unsanitized Filename

- **File:** services/api/supabase/functions/data-export/index.ts
- **Severity:** MEDIUM
- Content-Disposition header filename not sanitized.
- **Remediation:** Sanitize to alphanumeric + dashes only.

## LOW-1: Import File Size Limit Adequate

- 5MB max, 10K row limit. PASS.

## LOW-2: Edge Function Input Validation Consistent

- All Edge Functions validate required fields. PASS.

## Positive Findings

- All SQL queries parameterized (web)
- RLS enforced server-side (Supabase)
- Sync rules use column allowlisting
- CORS origin allowlist (never wildcard)
- Rate limiting on all Edge Functions
