# Sync Encryption Review — Sprint 24

**Date:** 2025-07-27
**Reviewer:** Security Reviewer Agent
**Scope:** PowerSync sync rules, KMP sync engine, field-level encryption, data-in-transit protection
**Standard:** OWASP MASVS-CRYPTO, MASVS-NETWORK

---

## Executive Summary

The sync encryption architecture is **well-designed** with envelope encryption (DEK/KEK), column allowlisting in PowerSync sync rules, proper tenant isolation via `household_id` bucketing, and explicit exclusion of sensitive columns (`public_key`, `sync_version`, `is_synced`). Field-level encryption protects `payee`, `note`, and `account.name`. However, `amount_cents` remains unencrypted for queryability, and web-side OPFS/IndexedDB storage lacks encryption at rest.

### Finding Summary

| Severity     | Count |
| ------------ | ----- |
| **CRITICAL** | 1     |
| **HIGH**     | 1     |
| **MEDIUM**   | 3     |
| **LOW**      | 2     |

---

## Detailed Findings

### CRITICAL-1: Web OPFS/IndexedDB Stores Financial Data Unencrypted

- **File:** `apps/web/src/db/sqlite-wasm.ts`
- **Severity:** CRITICAL
- **Description:** The web app stores the full SQLite database in OPFS (or IndexedDB fallback) without any encryption layer. Unlike native platforms that use SQLCipher, the web database contains all financial data (transactions, balances, account names, payees, notes) in plaintext on disk. OPFS files are origin-scoped but accessible to any JavaScript running in the same origin, including XSS payloads and browser extensions.
- **MASVS:** MASVS-STORAGE-1, MASVS-CRYPTO-1
- **Impact:** XSS or compromised browser extension could read complete financial history.
- **Remediation:** Implement SQLCipher-equivalent encryption for wa-sqlite. Options: (a) Use `@aspect-build/aspect-crypto` for OPFS-level encryption, (b) Implement Web Crypto API-based encryption wrapper around OPFS writes, (c) Use the `wa-sqlite` cipher extension. This is documented in `docs/architecture/security/web-encryption-spec.md` but not yet implemented.

### HIGH-1: Field Encryption Excludes amount_cents — Accepted Risk Not Formally Documented

- **File:** `packages/sync/src/commonMain/kotlin/com/finance/sync/crypto/FieldEncryptor.kt`, lines 31-42
- **Severity:** HIGH
- **Description:** Only `payee`, `note`, and `account.name` are classified as sensitive for field-level encryption. `amount_cents` is explicitly left queryable. Combined with dates, categories, and account IDs, unencrypted amounts enable financial behavior inference by anyone with server-side access. The privacy audit (v1) noted this but no formal risk acceptance document exists.
- **MASVS:** MASVS-CRYPTO-2
- **Remediation:** Create a formal risk acceptance document. Consider order-preserving encryption or homomorphic encryption for amounts if server-side queries are needed. At minimum, document the threat model for unencrypted amounts.

### MEDIUM-1: Sync Rules Do Not Filter by deleted_at for user_consents

- **File:** `services/api/powersync/sync-rules.yaml`, lines 200-204
- **Severity:** MEDIUM
- **Description:** The `user_consents` query in the `user_profile` bucket does not include `AND deleted_at IS NULL`. While consent records may not use soft deletes, this is inconsistent with every other query in the sync rules which all include the soft-delete filter.
- **Remediation:** Add `AND deleted_at IS NULL` to the user_consents query for consistency, or document why it is intentionally omitted.

### MEDIUM-2: PowerSync Sync Rules Expose invite_code in household_invitations

- **File:** `services/api/powersync/sync-rules.yaml`, line 104
- **Severity:** MEDIUM
- **Description:** The `invite_code` column is included in the `household_invitations` sync query. While `invited_email` is correctly excluded (noted as GDPR PII), `invite_code` is a bearer credential — anyone who obtains it can accept the invitation. Syncing it to all household members increases the exposure surface.
- **Remediation:** Consider excluding `invite_code` from sync rules. Only the inviter needs it (to share), and the invitee receives it out-of-band.

### MEDIUM-3: Referral Records Sync referee_id to Referrer

- **File:** `services/api/powersync/sync-rules.yaml`, lines 192-197
- **Severity:** MEDIUM
- **Description:** The referrals query syncs records where the user is either the `referrer_id` OR `referee_id`. This means user A (referrer) receives the `referee_id` (user B's UUID) in their sync data. While UUIDs are opaque, they are stable identifiers that could be correlated if a user has access to other data sources.
- **Remediation:** Consider anonymizing `referee_id` in synced data, or only sync records where the user is the referrer (the referee sees their own record via the OR clause anyway).

### LOW-1: No Key Rotation Mechanism for Field Encryption DEKs

- **Description:** The envelope encryption architecture supports key derivation but there is no documented or implemented key rotation schedule. Long-lived DEKs increase the blast radius of key compromise.
- **Remediation:** Implement periodic DEK rotation with re-encryption of affected records. Document rotation schedule in security architecture.

### LOW-2: Sync Health Logs Contain device_id

- **File:** PowerSync sync health monitoring
- **Severity:** LOW
- **Description:** `sync_health_logs` contain `device_id` which is a persistent device identifier. While needed for diagnostics, retention should be bounded.
- **Remediation:** Implement 30-day retention purge as documented but not yet implemented.

---

## Architecture Assessment

| Layer                   | Encryption          | Status   |
| ----------------------- | ------------------- | -------- |
| Data in transit (HTTPS) | TLS 1.2+            | PASS     |
| PowerSync replication   | TLS                 | PASS     |
| Supabase PostgreSQL     | Encrypted at rest   | PASS     |
| Android local DB        | SQLCipher 4.6.1     | PASS     |
| iOS local DB            | SQLCipher           | PASS     |
| Windows local DB        | SQLCipher (JVM)     | PASS     |
| Web local DB            | None (OPFS)         | **FAIL** |
| Field-level encryption  | AES-256-GCM (DEK)   | PARTIAL  |
| Key management          | Envelope DEK/KEK    | PASS     |
| Sync rule isolation     | Household bucketing | PASS     |
| Column allowlisting     | Explicit SELECT     | PASS     |
