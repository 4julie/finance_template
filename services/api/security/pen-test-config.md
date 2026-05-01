# Automated Penetration Testing Configuration

## Scope

### In-Scope Targets

- Supabase Edge Functions (all endpoints under /functions/v1/)
- Supabase REST API (PostgREST layer)
- Supabase Auth endpoints
- PowerSync sync endpoints
- Web PWA (apps/web/ deployment)

### Out-of-Scope

- Supabase infrastructure (managed by Supabase Inc.)
- Third-party APIs (ECB, bank providers)
- Production database (staging only)
- Other tenants on shared Supabase infrastructure

## Methodology

### OWASP Top 10 Coverage

| #   | Category                  | Test Method                                        |
| --- | ------------------------- | -------------------------------------------------- |
| A01 | Broken Access Control     | RLS bypass attempts, IDOR testing                  |
| A02 | Cryptographic Failures    | TLS config, key management review                  |
| A03 | Injection                 | SQL injection via PostgREST, XSS in Edge Functions |
| A04 | Insecure Design           | Business logic flaws, rate limit bypass            |
| A05 | Security Misconfiguration | CORS, headers, RLS policy audit                    |
| A06 | Vulnerable Components     | Dependency scanning (npm audit, deno)              |
| A07 | Auth Failures             | JWT validation, passkey flow testing               |
| A08 | Data Integrity            | Sync conflict exploitation                         |
| A09 | Logging Failures          | PII leak detection in logs                         |
| A10 | SSRF                      | Edge Function outbound request testing             |

### OWASP ZAP Configuration

ZAP is configured for automated scanning of the staging environment.

Key ZAP scan policies:

- **Active Scan**: SQL injection, XSS, path traversal, SSRF
- **Passive Scan**: Missing headers, cookie flags, information disclosure
- **Authentication**: Configure JWT bearer token for authenticated scans
- **Context**: Scope limited to Edge Function URLs only

### Test Schedule

| Test Type          | Frequency     | Environment |
| ------------------ | ------------- | ----------- |
| Automated ZAP scan | Weekly (CI)   | Staging     |
| Manual pen test    | Quarterly     | Staging     |
| Dependency audit   | Daily (CI)    | All         |
| RLS policy review  | Per migration | Staging     |

## Findings Template

### Finding Report Format

| Field              | Description                               |
| ------------------ | ----------------------------------------- |
| ID                 | VULN-YYYY-NNN                             |
| Severity           | Critical / High / Medium / Low / Info     |
| CVSS Score         | 0.0 - 10.0                                |
| Affected Component | Edge Function name, table, or endpoint    |
| Description        | What the vulnerability is                 |
| Steps to Reproduce | Numbered steps                            |
| Impact             | What an attacker could achieve            |
| Remediation        | How to fix it                             |
| Status             | Open / In Progress / Resolved / Won't Fix |
| Resolution Date    | When fixed (or target date)               |

## Remediation SLAs

| Severity | Response Time | Fix Deadline |
| -------- | ------------- | ------------ |
| Critical | 4 hours       | 24 hours     |
| High     | 24 hours      | 7 days       |
| Medium   | 3 days        | 30 days      |
| Low      | 7 days        | 90 days      |
