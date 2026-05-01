# Rate Limiting Configuration

## Overview

All Edge Functions are rate-limited using a database-backed sliding window algorithm.
The check_rate_limit PostgreSQL RPC performs atomic UPSERT operations for consistency.

## Current Rate Limits

| Endpoint             | Max Requests | Window | Key Type |
| -------------------- | ------------ | ------ | -------- |
| health-check         | 60           | 60s    | IP       |
| auth-webhook         | 30           | 60s    | IP       |
| passkey-register     | 10           | 60s    | User     |
| passkey-authenticate | 20           | 60s    | User     |
| household-invite     | 30           | 60s    | User     |
| data-export          | 10           | 3600s  | User     |
| account-deletion     | 3            | 3600s  | User     |
| generate-report      | 30           | 60s    | User     |
| exchange-rates       | 60           | 60s    | User     |
| detect-bills         | 10           | 60s    | User     |
| import-data          | 5            | 60s    | User     |
| investment-sync      | 20           | 60s    | User     |
| spending-forecast    | 30           | 60s    | User     |
| bank-connection      | 30           | 60s    | User     |
| bank-webhook         | 120          | 60s    | IP       |
| anomaly-detection    | 30           | 60s    | User     |
| consent-management   | 30           | 60s    | User     |
| family-plan          | 20           | 60s    | User     |
| referral             | 20           | 60s    | User     |

## Design Principles

1. **Fail-open**: If the rate limit DB check fails, requests are allowed
2. **User-based**: Authenticated endpoints use user ID as the key
3. **IP-based**: Pre-auth endpoints use client IP (rightmost X-Forwarded-For)
4. **Burst detection**: Enhanced check supports burst limits with temporary blocks
5. **Headers**: Every response includes X-RateLimit-\* headers for client visibility

## Enhanced Rate Limiting (Burst Detection)

The check_rate_limit_enhanced RPC adds burst detection:

- If a client exceeds 2x the normal limit in rapid succession, they are blocked
- Blocks last 300 seconds (5 minutes) by default
- Blocked clients receive 429 with block_reason in the response
- Expired blocks are cleaned up by cleanup_expired_rate_limit_blocks()

## Tuning Guidelines

- **Read-heavy endpoints** (GET): Higher limits (30-60 req/min)
- **Write-heavy endpoints** (POST): Lower limits (5-20 req/min)
- **Expensive operations** (export, import, detect): Strictest limits (3-10 req/hour)
- **Webhooks**: Higher limits to avoid dropping provider events (120 req/min)
