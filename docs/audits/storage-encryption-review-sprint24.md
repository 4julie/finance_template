# Storage Encryption Review - Sprint 24

**Date:** 2025-07-27
**Standard:** OWASP MASVS-STORAGE, MASVS-CRYPTO

## Summary: 1 CRITICAL, 1 HIGH, 3 MEDIUM, 2 LOW

## CRITICAL-1: Web Platform No Encryption at Rest

- **File:** apps/web/src/db/sqlite-wasm.ts
- **Severity:** CRITICAL
- Web SQLite-WASM database stored in OPFS/IndexedDB without encryption. All financial data (transactions, balances, account names, payees, notes) in plaintext on disk. OPFS is origin-scoped but accessible to XSS payloads and browser extensions.
- **Impact:** Complete financial data exposure via XSS or compromised browser extension.
- **Remediation:** Implement Web Crypto API encryption (wa-sqlite cipher extension, OPFS wrapper, or page-level AES-256-GCM).

## HIGH-1: JVM KeyStore Hardcoded Password

- **Severity:** HIGH
- JVM KeyStore for Windows/Desktop uses hardcoded password. If keystore file extracted, hardcoded password allows immediate key recovery.
- **Remediation:** Derive keystore password from Windows DPAPI.

## MEDIUM-1: No Key Rotation Schedule

- **Severity:** MEDIUM
- No DEK rotation mechanism implemented. Long-lived DEKs increase blast radius.
- **Remediation:** Implement 90-day DEK rotation with background re-encryption.

## MEDIUM-2: SQLCipher Version Currency

- **File:** gradle/libs.versions.toml line 9
- **Severity:** MEDIUM
- SQLCipher Android 4.6.1 pinned. Monitor for updates.

## MEDIUM-3: Android Onboarding PII in Plain SharedPreferences

- **File:** OnboardingViewModel.kt lines 92-93, 171-200
- **Severity:** MEDIUM
- userName, userEmail, starting balance stored in plain SharedPreferences (not EncryptedSharedPreferences).
- **Remediation:** Use EncryptedSharedPreferences or clear after onboarding.

## LOW-1: iOS TokenStorage Missing ThisDeviceOnly

- **Severity:** LOW
- Uses kSecAttrAccessibleAfterFirstUnlock without ThisDeviceOnly. Allows iCloud sync of tokens.

## LOW-2: DB Key Derivation Parameters Not Documented

- **Severity:** LOW
- SQLCipher defaults used without explicit documentation of KDF iterations, page size.

---

## Platform Encryption Matrix

| Platform | DB Encryption   | Key Storage      | Status  |
| -------- | --------------- | ---------------- | ------- |
| Android  | SQLCipher 4.6.1 | Android Keystore | PASS    |
| iOS      | SQLCipher       | Keychain         | PASS    |
| Windows  | SQLCipher JVM   | DPAPI            | PARTIAL |
| Web      | None (OPFS)     | N/A              | FAIL    |
