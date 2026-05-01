# Security Posture Summary - Sprint 24

**Date:** 2025-07-27
**Overall Rating:** B+ (Good with Significant Gaps)

## Consolidated: 2 CRITICAL, 7 HIGH, 13 MEDIUM, 7 LOW

### CRITICAL

1. Web OPFS no encryption at rest (sqlite-wasm.ts)
2. Crypto-shredding is placeholder (account-deletion)

### HIGH

1. Passkey auth fallback no session token (auth-context.tsx:291)
2. KMP Android TokenStorage in-memory stub
3. Bank connection encryption stub
4. Rate limiting fails open under DB overload
5. JVM KeyStore hardcoded password
6. No certificate pinning on mobile
7. CSV import formula injection

### Strengths

- In-memory token storage on web
- CORS origin allowlist
- Passkey challenge scoping with one-time use
- RLS on all tables
- Column allowlisting in sync rules
- Rate limiting on all Edge Functions
- HMAC webhook verification

### Priority: P0 before launch, P1 Sprint 25, P2 Sprint 26

See individual sprint audit documents for details.
