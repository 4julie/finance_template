# Certificate Pinning Assessment

**Date:** 2025-07-27
**Standard:** OWASP MASVS-NETWORK

## Summary: No certificate pinning implemented on any platform

Strategy documents exist at docs/architecture/security/certificate-pinning-strategy.md and certificate-pinning-implementation.md but no implementation has been done.

## Current State

| Platform | Pinning                | TLS Version           | Status          |
| -------- | ---------------------- | --------------------- | --------------- |
| Android  | None                   | TLS 1.2+ (OkHttp)     | NOT IMPLEMENTED |
| iOS      | None                   | TLS 1.2+ (URLSession) | NOT IMPLEMENTED |
| Web      | None (browser-managed) | TLS 1.2+              | N/A (browser)   |
| Windows  | None                   | TLS 1.2+ (OkHttp)     | NOT IMPLEMENTED |

## HIGH-1: No Certificate Pinning on Mobile

- **Severity:** HIGH
- Mobile apps connect to Supabase and PowerSync without certificate pinning, vulnerable to MITM with rogue CA.
- **Remediation (Android):** OkHttp CertificatePinner with backup pins and reporting.
- **Remediation (iOS):** URLSession delegate with SecTrustEvaluateWithError + pinned SPKI hashes.
- **Remediation (Windows/JVM):** OkHttp CertificatePinner (same as Android).

## MEDIUM-1: No HSTS Headers

- **Severity:** MEDIUM
- Edge Function responses do not set Strict-Transport-Security header.
- **Remediation:** Add HSTS header with max-age=31536000; includeSubDomains; preload.

## MEDIUM-2: No CSP Headers for Web

- **Severity:** MEDIUM
- No Content-Security-Policy headers configured for the web application.
- **Remediation:** Implement strict CSP with nonce-based script-src.

## LOW-1: No Certificate Transparency Monitoring

- **Severity:** LOW
- No CT log monitoring for finance domain certificates.

## Recommended Implementation Order

1. Android (OkHttp CertificatePinner) - easiest, shared with KMP
2. iOS (URLSession pinning delegate)
3. HSTS + CSP headers for web
4. CT log monitoring

## Pin Rotation Strategy

- Pin to SPKI hash of intermediate CA (not leaf)
- Always include backup pin
- 30-day overlap period during rotation
- Report-only mode for 2 weeks before enforcement
