# Privacy Compliance Review - Sprint 24

**Date:** 2025-07-27
**Standards:** GDPR, CCPA, PIPEDA

## Compliance Scores

| Regulation | Estimated Score | Previous | Change |
| ---------- | --------------- | -------- | ------ |
| GDPR       | ~58%            | ~55%     | +3%    |
| CCPA       | ~63%            | ~60%     | +3%    |
| PIPEDA     | ~50%            | N/A      | New    |

## CRITICAL-1: Crypto-Shredding Placeholder

- **File:** services/api/supabase/functions/account-deletion/index.ts
- **Severity:** CRITICAL
- Account deletion has crypto-shredding intent but implementation is a placeholder stub. No actual key destruction occurs. User data is soft-deleted but encryption keys are not rotated or destroyed.
- **GDPR Impact:** Art 17 Right to Erasure not fully implemented.
- **Remediation:** Implement actual key destruction in account deletion flow.

## HIGH-1: No Published Privacy Policy

- **Severity:** HIGH
- No privacy policy accessible in any app or web interface.
- **GDPR Impact:** Art 13/14 violation.
- **Remediation:** Draft and publish privacy policy.

## HIGH-2: No Consent UI Implemented

- **Severity:** HIGH
- consent-management Edge Function exists but no client-side UI wired.
- **GDPR Impact:** Art 7 consent requirements unmet.
- **Remediation:** Implement consent collection UI on all platforms.

## MEDIUM-1: Data Retention Undefined

- **Severity:** MEDIUM
- No retention schedules defined for transaction history, audit logs, sync data.
- **Remediation:** Define and implement retention policies.

## MEDIUM-2: Data Export Weak Anonymization

- **File:** services/api/supabase/functions/data-export/index.ts line 151-159
- **Severity:** MEDIUM
- Other household members' PII anonymized with weak hash (not cryptographic).
- **Remediation:** Use HMAC-SHA256 for anonymization.

## MEDIUM-3: Sync Rules Expose Deleted Consents

- **File:** services/api/powersync/sync-rules.yaml
- **Severity:** MEDIUM
- user_consents table synced without filtering deleted_at, exposing withdrawn consent records.

## Data Flow Summary

| Data Type       | Encrypted at Rest    | Encrypted in Transit | Retention Defined |
| --------------- | -------------------- | -------------------- | ----------------- |
| Transactions    | Native: Yes, Web: No | Yes (TLS)            | No                |
| Account Details | Native: Yes, Web: No | Yes (TLS)            | No                |
| User PII        | Supabase Auth        | Yes (TLS)            | No                |
| Sync Metadata   | Field-level AES      | Yes (TLS)            | No                |

## Recommendations

1. Implement crypto-shredding (CRITICAL)
2. Publish privacy policy (HIGH)
3. Build consent UI (HIGH)
4. Define retention schedules
5. Fix anonymization hash strength
6. Filter withdrawn consents from sync
