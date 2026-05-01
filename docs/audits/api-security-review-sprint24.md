# API Endpoint Security Review - Sprint 24

**Date:** 2025-07-27
**Reviewer:** Security Reviewer Agent
**Scope:** All 25+ Edge Functions in services/api/supabase/functions/, shared modules in \_shared/
**Standard:** OWASP ASVS v4.0, OWASP API Security Top 10

---

## Executive Summary

The Edge Functions demonstrate **mature security patterns**: consistent use of requireAuth() for authentication, validateEnv() for startup checks, checkRateLimit() for throttling, origin-validated CORS, structured logging that avoids PII, and parameterized queries via Supabase client. Notable strengths include constant-time secret comparison (timingSafeEqual), abuse detection, and webhook verification with replay prevention.

### Finding Summary

| Severity | Count |
| -------- | ----- |
| CRITICAL | 0     |
| HIGH     | 2     |
| MEDIUM   | 4     |
| LOW      | 3     |

---

## Detailed Findings

### HIGH-1: Bank Connection Encryption Is a Stub

- **File:** services/api/supabase/functions/bank-connection/index.ts, lines 74-80
- **Severity:** HIGH
- **Description:** Bank access token encryption is a stub. Tokens grant read access to real bank accounts. If stored unencrypted, a database breach exposes live bank credentials.
- **Remediation:** Implement AES-256-GCM encryption using Web Crypto API with BANK_ENCRYPTION_KEY.

### HIGH-2: Rate Limiting Fails Open Under DB Overload

- **File:** services/api/supabase/functions/\_shared/rate-limit.ts, lines 124-157
- **Severity:** HIGH
- **Description:** Both checkRateLimit() and checkRateLimitEnhanced() return allowed:true when the database RPC fails. Under sustained load, ALL rate limits are disabled.
- **Remediation:** Implement local in-memory fallback rate limiter that activates when DB-backed limiter fails.

### MEDIUM-1: Data Export Anonymization Uses Weak Hash

- **File:** services/api/supabase/functions/data-export/index.ts, lines 151-159
- **Severity:** MEDIUM
- **Description:** anonymizeUserId() uses simple string hash instead of cryptographic hash. For GDPR, use HMAC-SHA256.
- **Remediation:** Replace with crypto.subtle.digest or HMAC-SHA256 with per-export salt.

### MEDIUM-2: CSV Parser Vulnerable to Formula Injection

- **File:** services/api/supabase/functions/import-data/index.ts, lines 70-80
- **Severity:** MEDIUM
- **Description:** CSV parser processes user-uploaded files without sanitizing formula-injection characters (=, +, -, @).
- **Remediation:** Sanitize CSV cell values by prefixing dangerous characters before storing.

### MEDIUM-3: Content-Disposition Header Potential Injection

- **File:** services/api/supabase/functions/\_shared/response.ts, line 82
- **Severity:** MEDIUM
- **Description:** streamingResponse() constructs Content-Disposition with unsanitized filename.
- **Remediation:** Sanitize filename. Use RFC 5987 encoding.

### MEDIUM-4: Consent Management Reflects User Input in Error

- **File:** services/api/supabase/functions/consent-management/index.ts, line 65
- **Severity:** MEDIUM
- **Description:** Invalid consent type error includes raw user input, potential reflected XSS.
- **Remediation:** Return generic error listing valid types without echoing input.

### LOW-1: Missing Security Headers on Responses

- **Severity:** LOW
- **Remediation:** Add X-Content-Type-Options, X-Frame-Options, HSTS headers.

### LOW-2: Admin Dashboard No Audit Logging

- **Severity:** LOW
- **Remediation:** Log admin access to audit_log table.

### LOW-3: Webhook Nonce Validation Fails Open

- **File:** services/api/supabase/functions/\_shared/webhook-verify.ts, lines 93-105
- **Severity:** LOW
- **Remediation:** Consider failing closed for webhook nonce validation.

---

## Shared Module Assessment

| Module             | Purpose                  | Assessment          |
| ------------------ | ------------------------ | ------------------- |
| auth.ts            | JWT verification         | PASS                |
| cors.ts            | Origin allowlist CORS    | PASS                |
| rate-limit.ts      | DB-backed sliding window | PARTIAL (fail-open) |
| crypto.ts          | Timing-safe comparison   | PASS                |
| abuse-detection.ts | Error-frequency blocking | PASS                |
| logger.ts          | Structured JSON logging  | PASS                |
| response.ts        | Standardized responses   | PASS                |
| env.ts             | Env var validation       | PASS                |
| session-binding.ts | Device fingerprint       | PARTIAL (soft)      |
| webhook-verify.ts  | HMAC + nonce + IP        | PASS                |
