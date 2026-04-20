# ADR-0013: Multi-Tenancy Architecture — Household Isolation, Enterprise Accounts, Data Partitioning

**Status:** Proposed
**Date:** 2025-07-27
**Author:** System Architect (AI agent)
**Reviewers:** Pending human review
**Sprint:** S11

## Context

Finance's tenant model is built around the **household** (ADR-0004, sync-rules.yaml). As the product scales, three extensions are needed:

1. **Stronger isolation** — JWT-embedded claims instead of application-level context
2. **Enterprise/advisor accounts** — A super-tenant layer above households
3. **Data partitioning** — GDPR data residency for multi-region deployments

### Current Model

```
User ──┬── Household A (Owner): Accounts, Transactions, Budgets
       └── Household B (Member): Accounts, Transactions, Budgets
```

This doesn't address advisors managing 50+ households, organizations, or regional data residency.

## Decision

Extend the tenant model with an **optional organization layer**, **JWT-embedded tenant context**, and **region-aware partitioning**.

### 1. Extended Tenant Hierarchy

```
Organization (optional)
├── OrgOwner, OrgAdmin, OrgAdvisor, OrgBilling
├── Household A (linked, advisor-assigned)
├── Household B (linked)
└── Org Settings: defaults, billing, audit logs
```

**Key principle: households remain the data isolation boundary.** Organizations are an access-control layer, not a data layer.

### 2. JWT-Embedded Tenant Context

```json
{
  "sub": "user-uuid",
  "household_memberships": [
    { "household_id": "hh-1", "role": "owner" },
    { "household_id": "hh-2", "role": "member" }
  ],
  "org_memberships": [{ "org_id": "org-1", "role": "org_advisor" }],
  "data_region": "eu-west"
}
```

**RLS using JWT claims:**

```sql
CREATE POLICY transactions_isolation ON transactions
  FOR ALL USING (
    household_id IN (
      SELECT (claim->>'household_id')::uuid
      FROM jsonb_array_elements(
        current_setting('request.jwt.claims', true)::jsonb->'household_memberships'
      ) AS claim
    )
  );
```

Advantages: cryptographically signed, no forgotten SET context, built-in audit trail.

### 3. Organization Data Model

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'advisor_basic',
    max_households INT NOT NULL DEFAULT 10,
    data_region TEXT NOT NULL DEFAULT 'us-east',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('org_owner','org_admin','org_advisor','org_billing')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ,
    UNIQUE (org_id, user_id)
);

CREATE TABLE org_household_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    household_id UUID NOT NULL REFERENCES households(id),
    assigned_advisor_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ,
    UNIQUE (org_id, household_id)
);

CREATE TABLE org_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),
    actor_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL, target_household_id UUID,
    target_resource_type TEXT, target_resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4. Organization RBAC

| Permission                | OrgOwner | OrgAdmin | OrgAdvisor    | OrgBilling |
| ------------------------- | -------- | -------- | ------------- | ---------- |
| View managed households   | ✅ All   | ✅ All   | Assigned only | ❌         |
| Manage household links    | ✅       | ✅       | ❌            | ❌         |
| View financial data       | ✅ All   | ✅ All   | Assigned only | ❌         |
| **Modify financial data** | **❌**   | **❌**   | **❌**        | **❌**     |
| Manage org members        | ✅       | ✅       | ❌            | ❌         |
| Manage billing            | ✅       | ❌       | ❌            | ✅         |
| View audit logs           | ✅       | ✅       | Own only      | ❌         |

**Critical: Org members can NEVER modify household financial data.** Read-only access only.

### 5. Data Region Partitioning

```
Global Coordinator (metadata + routing)
  ├── EU-West Region (Frankfurt): household data, PowerSync node
  └── US-East Region (Virginia): household data, PowerSync node
```

Region assigned at household creation based on signup location. Immutable without admin migration. **Tier 4 concern (ADR-0011) — design now, implement later.**

### 6. Isolation Verification

Automated canary queries in CI and production:

```sql
-- Detect orphaned transactions (cross-tenant leak indicator)
SELECT COUNT(*) FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM households h WHERE h.id = t.household_id AND h.deleted_at IS NULL
) AND t.deleted_at IS NULL;
```

### 7. Sync Architecture

New `by_organization` sync bucket:

```yaml
by_organization:
  parameters:
    - SELECT om.org_id FROM org_members om
      WHERE om.user_id = token_parameters.user_id AND om.deleted_at IS NULL
  data:
    - SELECT id, name, slug, plan, max_households, data_region, created_at, updated_at
      FROM organizations WHERE id = bucket.org_id AND deleted_at IS NULL
    - SELECT id, org_id, user_id, role, created_at, updated_at
      FROM org_members WHERE org_id = bucket.org_id AND deleted_at IS NULL
    - SELECT id, org_id, household_id, assigned_advisor_id, created_at
      FROM org_household_assignments WHERE org_id = bucket.org_id AND deleted_at IS NULL
```

## Alternatives Considered

### Alternative 1: Database-Per-Tenant

- **Pros:** Strongest isolation; easy backup/restore per tenant.
- **Cons:** Thousands of databases; PowerSync needs one instance each; impractical for self-hosted.

### Alternative 2: Schema-Per-Tenant

- **Pros:** Strong isolation in single database.
- **Cons:** Linear schema management; incompatible with Citus sharding (ADR-0011).

### Alternative 3: No Organization Layer

- **Pros:** Simpler model.
- **Cons:** No grouping for advisors; no bulk ops; no org billing; no audit trail.

## Consequences

### Positive

- **Backward compatible** — Org layer is optional; existing households unchanged
- **Defense-in-depth** — JWT + RLS + application checks = three isolation barriers
- **Advisor use case** — Read-only access with audit logging
- **Compliance-ready** — Regional partitioning designed for GDPR

### Negative

- **RBAC complexity** — Two systems (household + org) must compose correctly
- **JWT size** — May need references instead of full membership objects
- **Third sync bucket** — `by_organization` adds sync complexity

### Risks

| Risk                     | Likelihood | Impact   | Mitigation                                 |
| ------------------------ | ---------- | -------- | ------------------------------------------ |
| JWT exceeds header limit | Medium     | Medium   | Use ID refs; fetch details from cached API |
| RLS policy bugs          | Medium     | Critical | Automated canary tests; manual review      |
| Privilege escalation     | Low        | Critical | Org RLS is SELECT-only; no write policies  |

## Implementation Notes

### Migration Sequence

```
Phase 1 (V2):   JWT household claims → stronger RLS
Phase 2 (V2.1): Organization tables + sync bucket
Phase 3 (Tier 4): Regional data partitioning
```

## References

- [ADR-0004: Auth & Security Architecture](./0004-auth-security-architecture.md)
- [ADR-0011: Scaling Architecture](./0011-scaling-architecture.md)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [GDPR Data Residency](https://gdpr-info.eu/)
