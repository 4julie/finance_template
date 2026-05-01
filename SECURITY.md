# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in Finance,
please report it responsibly.

### How to Report

1. **Email**: security@finance-app.dev
2. **GitHub**: Use [GitHub Security Advisories](../../security/advisories/new)

**DO NOT** open a public GitHub issue for security vulnerabilities.

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected components (Edge Function name, table, endpoint)
- Potential impact
- Suggested fix (if any)

### Response Timeline

| Action                  | Timeline              |
| ----------------------- | --------------------- |
| Acknowledgment          | Within 24 hours       |
| Initial assessment      | Within 48 hours       |
| Status update           | Every 7 days          |
| Fix for critical issues | Within 72 hours       |
| Coordinated disclosure  | After fix is deployed |

## Supported Versions

| Version          | Supported           |
| ---------------- | ------------------- |
| Latest release   | Yes                 |
| Previous release | Security fixes only |
| Older versions   | No                  |

## Bug Bounty Program

### Scope

**In scope:**

- Row-Level Security (RLS) bypass
- Authentication/authorization bypass
- Cross-household data access
- SQL injection via Edge Functions or PostgREST
- Sensitive data exposure (financial data, PII)
- Rate limiting bypass
- Cross-site scripting (XSS) in the web app

**Out of scope:**

- Supabase platform infrastructure vulnerabilities
- Denial of service (DoS) attacks
- Social engineering
- Issues in third-party dependencies (report upstream)
- Self-XSS or issues requiring physical device access

### Reward Structure

| Severity              | Reward                     |
| --------------------- | -------------------------- |
| Critical (CVSS 9.0+)  | Recognition + priority fix |
| High (CVSS 7.0-8.9)   | Recognition                |
| Medium (CVSS 4.0-6.9) | Recognition                |
| Low (CVSS 0.1-3.9)    | Recognition                |

We are an open-source project and currently offer recognition-based rewards.
Valid reporters will be credited in release notes and SECURITY.md.

### Rules

- Do not access or modify other users' data
- Do not perform destructive actions
- Test only against staging environments
- Provide sufficient detail to reproduce the issue
- Allow reasonable time for a fix before disclosure

## Security Architecture

- All tables have Row-Level Security (RLS) enabled
- Household-level tenant isolation via RLS policies
- Supabase Auth with passkey (WebAuthn) support
- Rate limiting on all Edge Function endpoints
- Monetary values stored as BIGINT (never floating point)
- Structured logging that never includes financial data
- Certificate pinning on native clients
- GDPR/CCPA compliant data export and deletion
