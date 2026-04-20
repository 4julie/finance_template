# ADR-0012: API Versioning Strategy

**Status:** Proposed
**Date:** 2025-07-27
**Author:** System Architect (AI agent)
**Reviewers:** Pending human review
**Sprint:** S10

## Context

Finance exposes custom Edge Functions and PowerSync sync rules as API contracts. As the product evolves, breaking changes are inevitable — but Finance has **four independently-updated clients** with different update latencies:

| Platform | Update Latency |
| -------- | -------------- |
| iOS      | 1–14 days      |
| Android  | 1–7 days       |
| Web      | Minutes        |
| Windows  | 1–7 days       |

At any time, 2–3 client versions are active simultaneously. The versioning strategy must keep older clients functional while enabling new features.

### API Surface We Control

1. Custom Edge Functions (`/functions/v1/*`)
2. Sync-rules.yaml column allowlists (implicit data shape contract)

Supabase Auth, PostgREST, and the PowerSync protocol are managed externally.

## Decision

Adopt **URL-prefix versioning for Edge Functions** with a **sync protocol version header** and a **formal deprecation policy**.

### 1. URL Versioning

```
POST /functions/v1/banking/link-token
GET  /functions/v1/rates/latest

POST /functions/v2/banking/link-token  ← breaking change → new version
GET  /functions/v1/rates/latest        ← unchanged, stays at v1
```

- Version increments only on **breaking changes**
- Non-breaking additions stay in current version
- Each version is a separate Edge Function deployment
- All active versions run concurrently

### 2. Breaking Change Definition

| Change Type                  | Breaking? | Action                 |
| ---------------------------- | --------- | ---------------------- |
| Add optional response field  | No        | Add to current version |
| Add optional request param   | No        | Add to current version |
| Add new endpoint             | No        | Add to current version |
| Remove/rename response field | **Yes**   | New version            |
| Change field type            | **Yes**   | New version            |
| Add required request param   | **Yes**   | New version            |
| Remove endpoint              | **Yes**   | New version            |

### 3. Client Version Headers

```http
POST /functions/v1/banking/link-token HTTP/1.1
X-Finance-Client-Version: 2.1.0
X-Finance-Platform: ios
X-Finance-Sync-Version: 2
Authorization: Bearer <jwt>
```

Used for analytics, feature gating, compatibility responses, and deprecation warnings.

### 4. Deprecation Policy

```
T+0:     V(N+1) released. V(N) gets Sunset header.
T+90d:   V(N) returns Warning: 299 on every response.
T+180d:  Traffic review. If < 5% → proceed. If ≥ 5% → extend 90d.
T+270d:  V(N) returns 410 Gone.

Minimum support: 180 days. Max concurrent versions: 2.
```

```
Active → Deprecated (Sunset header) → Warning (299) → Gone (410)
  0d          +0d                       +90d          +180-270d
```

### 5. Migration Communication

**HTTP Headers:**

```http
Sunset: Sat, 01 Mar 2026 00:00:00 GMT
Deprecation: true
Link: </functions/v2/banking/link-token>; rel="successor-version"
```

**In-App:** Client reads `Deprecation` header → shows update banner.

**Developer:** Migration guide with request/response diffs per endpoint.

### 6. Backward Compatibility Patterns

- **Additive responses:** New optional fields don't break old clients
- **Parameter defaults:** New params default to backward-compatible values
- **Sync column defaulting:** KMP data classes use `null` defaults for new columns

```kotlin
data class Transaction(
    val id: String,
    val amountCents: Long,
    val recurringRuleId: String? = null, // V2 — null for V1 clients
)
```

## Alternatives Considered

### Alternative 1: Header-Based Versioning

- **Pros:** Cleaner URLs; content negotiation standards.
- **Cons:** Harder CDN/LB routing; less discoverable; poor Edge Function support.

### Alternative 2: No Versioning (Always Compatible)

- **Pros:** Simplest; no version management.
- **Cons:** Eventually impossible for inherently breaking changes. Multi-platform latency makes this untenable.

### Alternative 3: GraphQL

- **Pros:** Per-field deprecation; clients request exact fields needed.
- **Cons:** Overkill for 6–10 endpoints. Not aligned with PowerSync protocol.

## Consequences

### Positive

- **Multi-platform safety** — 6+ months support window covers all app stores
- **Clear contracts** — URL-prefix is universally understood
- **CDN-friendly** — Cacheable by path prefix
- **Analytics-driven** — Never deprecate without traffic data

### Negative

- **Code duplication** — Concurrent versions need shared logic with version adapters
- **Testing matrix** — 2 versions × 4 platforms = 8 configurations
- **Sync versioning complexity** — Conditional rules harder to reason about

### Risks

| Risk                   | Likelihood | Impact   | Mitigation                                                    |
| ---------------------- | ---------- | -------- | ------------------------------------------------------------- |
| Users refuse to update | Medium     | Medium   | In-app banners; force after 270d                              |
| Sync version mismatch  | Low        | Critical | Integration tests; client-side null defaults; gradual rollout |
| Too many versions      | Low        | Medium   | Policy: max 2 concurrent; V(N-2) always Gone                  |

## Implementation Notes

```kotlin
// packages/core/src/commonMain/kotlin/com/finance/core/config/ApiConfig.kt
object ApiConfig {
    const val CURRENT_API_VERSION = 1
    const val CURRENT_SYNC_VERSION = 2

    fun endpointUrl(path: String, version: Int = CURRENT_API_VERSION): String =
        "${baseUrl}/functions/v${version}/${path}"
}
```

## References

- [ADR-0002: Backend & Sync Architecture](./0002-backend-sync-architecture.md)
- [ADR-0010: V2 Architecture Vision](./0010-v2-architecture-vision.md)
- [RFC 8594 — Sunset Header](https://www.rfc-editor.org/rfc/rfc8594)
- [Stripe API Versioning](https://stripe.com/docs/api/versioning)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
