# Authentication Implementation Review — Sprint 24

**Date:** 2025-07-27
**Reviewer:** Security Reviewer Agent
**Scope:** Authentication code across Web, Android, iOS, Windows; Edge Functions (passkey-register, passkey-authenticate)
**Standard:** OWASP MASVS-AUTH, ASVS v4.0

---

## Executive Summary

The authentication implementation across all platforms demonstrates **strong security design** with appropriate use of platform-native secure storage, WebAuthn/passkeys with server-side session minting, PKCE for OAuth, and defense-in-depth token management. Two previously CRITICAL issues (CORS wildcard, passkey session bypass) have been resolved. The current posture is **HIGH** with targeted improvements needed.

### Finding Summary

| Severity          | Count |
| ----------------- | ----- |
| **CRITICAL**      | 0     |
| **HIGH**          | 2     |
| **MEDIUM**        | 4     |
| **LOW**           | 3     |
| **INFORMATIONAL** | 2     |

---

## Detailed Findings

### HIGH-1: Passkey Authentication Fallback Sets User Without Session Token

- **File:** `apps/web/src/auth/auth-context.tsx`, lines 291-297
- **Severity:** HIGH
- **Description:** When the session exchange call after passkey authentication fails (`!sessionResponse.ok`), the code falls back to setting the user state using only `result.userId` from the WebAuthn assertion without an access token. This creates a state where `user !== null` but `hasValidToken()` returns `false`. While `isAuthenticated` checks both conditions (line 145), individual components might check `user` directly, creating an inconsistent auth state. More critically, the user appears logged in but cannot make authenticated API calls.
- **MASVS:** MASVS-AUTH-2 (Session management)
- **Remediation:** Remove the fallback branch entirely. If the session exchange fails, the authentication should fail completely. Throw an error instead of creating a partial user state.

### HIGH-2: KMP Android TokenStorage Uses In-Memory Stub

- **File:** `packages/sync/src/androidMain/kotlin/com/finance/sync/auth/TokenStorage.android.kt`
- **Severity:** HIGH (previously documented in MASVS-STORAGE audit H-1)
- **Description:** The KMP sync layer's `TokenStorage` actual for Android uses a plain in-memory variable rather than delegating to the production `SecureTokenStorage` (which correctly uses `EncryptedSharedPreferences`). Tokens are not encrypted at rest and do not survive process death.
- **MASVS:** MASVS-STORAGE-1, MASVS-AUTH-2
- **Remediation:** Wire `TokenStorage.android.kt` to delegate to `SecureTokenStorage` via Koin DI.

### MEDIUM-1: No CSRF Protection on Email/Password Login Endpoint

- **File:** `apps/web/src/auth/auth-context.tsx`, lines 221-225
- **Severity:** MEDIUM
- **Description:** The `loginWithEmail` fetch uses `credentials: 'include'` but sends no CSRF token. JSON POST provides implicit CSRF protection via preflight, but this should be explicitly documented.
- **Remediation:** Document JSON-only as CSRF defense. Consider adding `X-Requested-With` header.

### MEDIUM-2: Signup Endpoint Missing credentials include

- **File:** `apps/web/src/auth/auth-context.tsx`, lines 363-366
- **Severity:** MEDIUM
- **Description:** `signupWithEmail` does not include `credentials: 'include'` unlike `loginWithEmail`. Backend-set cookies will not be received.
- **Remediation:** Add `credentials: 'include'` or document that signup requires separate login.

### MEDIUM-3: Session Binding Defaults to Soft Enforcement

- **File:** `services/api/supabase/functions/_shared/session-binding.ts`, lines 48-57
- **Severity:** MEDIUM
- **Description:** `hardEnforcement` defaults to `false`, meaning fingerprint mismatches only produce a `flag` action. For sensitive operations (account deletion, data export, passkey registration), hard enforcement should be enabled.
- **Remediation:** Enable `hardEnforcement: true` for account-deletion, data-export, and passkey-register.

### MEDIUM-4: Token Refresh Timer Not Cleared on Re-initialization

- **File:** `apps/web/src/auth/token-storage.ts`, lines 211-213
- **Severity:** MEDIUM
- **Description:** `initTokenManager()` can be called multiple times without clearing existing refresh timers, potentially leaving orphaned callbacks referencing stale closures.
- **Remediation:** Add cleanup logic in `initTokenManager` to clear existing timers.

### LOW-1: WebAuthn userVerification Set to preferred

- **File:** `services/api/supabase/functions/passkey-authenticate/index.ts`, line 162
- **Severity:** LOW
- **Description:** Authentication options use `userVerification: 'preferred'`, which may skip biometric/PIN. For a financial app, `'required'` provides stronger assurance.
- **Remediation:** Change to `userVerification: 'required'`.

### LOW-2: JWT Payload Parsing Duplicated

- **Files:** `apps/web/src/auth/auth-context.tsx` (line 520), `apps/web/src/auth/token-storage.ts` (line 108)
- **Severity:** LOW
- **Description:** Identical Base64URL JWT decoding logic duplicated across files.
- **Remediation:** Extract to shared `jwt-utils.ts` module.

### LOW-3: Admin Email-Based Authorization is Fragile

- **File:** `services/api/supabase/functions/admin-dashboard/index.ts`, lines 70-79
- **Severity:** LOW
- **Description:** Admin check relies on email string matching from env var. Email changes break access.
- **Remediation:** Consider database-backed admin role table for production.

### INFORMATIONAL-1: Token Storage Design is Exemplary

- **File:** `apps/web/src/auth/token-storage.ts`
- **Description:** Follows all OWASP best practices: in-memory only, HttpOnly cookie refresh, proactive refresh with 2-min threshold, concurrent refresh deduplication, clear security invariants.

### INFORMATIONAL-2: Passkey Authentication Has Strong Anti-Replay

- **File:** `services/api/supabase/functions/passkey-authenticate/index.ts`
- **Description:** Correctly implements scoped challenge lookup, one-time use deletion, 5-min TTL, counter verification, deleted-user check, and session integrity validation.

---

## Platform Assessment

| Platform     | Token Storage               | Auth Flow          | Biometric       | Rating |
| ------------ | --------------------------- | ------------------ | --------------- | ------ |
| **Web**      | In-memory + HttpOnly cookie | Passkey + Email/PW | N/A (WebAuthn)  | Strong |
| **Android**  | EncryptedSharedPreferences  | Supabase Auth      | BiometricPrompt | Strong |
| **iOS**      | Keychain (WhenUnlocked)     | Supabase Auth      | LAContext       | Strong |
| **Windows**  | DPAPI                       | Supabase Auth      | Windows Hello   | Strong |
| **KMP Sync** | In-memory stub (Android)    | Token forwarding   | N/A             | Gap    |
