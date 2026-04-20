# ADR-0011: Scaling Architecture — Horizontal Scaling, Database Sharding, CDN

**Status:** Proposed
**Date:** 2025-07-27
**Author:** System Architect (AI agent)
**Reviewers:** Pending human review
**Sprint:** S9

## Context

Finance V1 targets a self-hosted single-VPS deployment (2 vCPU / 4 GB RAM, ~$10–20/mo, see ADR-0007). The edge-first architecture provides a massive scaling advantage: **the server is not in the hot path for most operations.** Users read/write locally; the server only handles sync (background), auth (infrequent), and webhooks (async). This means the server can handle 10x more users than a traditional app.

However, the freemium model (ADR-0009) could attract 10K–100K+ users, requiring a planned scaling path.

### Current Bottlenecks at Scale

| Component         | V1 Capacity        | Bottleneck At      |
| ----------------- | ------------------ | ------------------ |
| PostgreSQL        | ~10K connections   | ~5K households     |
| PowerSync         | ~10K sync sessions | ~5K active devices |
| VPS (2 vCPU/4 GB) | ~500 req/s         | ~2K concurrent     |

## Decision

Adopt a **phased scaling architecture** with four tiers, each triggered by capacity ceilings.

### Tier 1: Vertical Scaling (100–1K users)

**Trigger:** VPS CPU > 70% sustained or memory > 80%.

- Upgrade VPS to 4 vCPU / 8 GB (~$20–40/mo)
- Add PgBouncer connection pooling
- Enable Caddy response caching

### Tier 2: Read Replicas + Service Separation (1K–10K users)

**Trigger:** DB write latency > 50ms p95 or sync lag > 5s.

- PostgreSQL primary + read replica
- PowerSync on dedicated VPS
- Redis for session caching and rate limiting
- **Cost:** ~$40–80/mo

### Tier 3: Horizontal Scaling + Sharding (10K–100K users)

**Trigger:** Primary write throughput > 70% or WebSocket connections > 8K.

- **Database sharding by `household_id`** via Citus extension
- Multiple stateless API nodes behind load balancer
- PowerSync cluster with consistent hashing

#### Why `household_id` Is the Ideal Shard Key

1. **Natural isolation** — All queries already filtered by `household_id` (RLS, sync rules)
2. **Even distribution** — UUIDs distribute uniformly
3. **Colocation** — All household data on same shard (efficient JOINs)
4. **Sync alignment** — PowerSync `by_household` bucket maps 1:1 to shards

```sql
-- Citus: distribute household-scoped tables
SELECT create_distributed_table('transactions', 'household_id');
SELECT create_distributed_table('accounts', 'household_id');
SELECT create_distributed_table('categories', 'household_id');
SELECT create_distributed_table('budgets', 'household_id');
SELECT create_distributed_table('goals', 'household_id');

-- Global data: replicate to all shards
SELECT create_reference_table('exchange_rates');
SELECT create_reference_table('users');
```

```
┌────────────────────────────────────────────────┐
│                Load Balancer                     │
└───────┬──────────────┬──────────────┬───────────┘
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ API Node 1   │ │ API Node 2 │ │ API Node 3 │
│ (stateless)  │ │ (stateless)│ │ (stateless)│
└───────┬──────┘ └─────┬──────┘ └─────┬──────┘
        └──────────────┼──────────────┘
┌──────────────────────▼─────────────────────────┐
│           Citus Coordinator                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Shard 1  │ │ Shard 2  │ │ Shard 3  │       │
│  └──────────┘ └──────────┘ └──────────┘       │
└────────────────────────────────────────────────┘
```

**Cost:** ~$100–200/mo (3–5 VPS instances)

### Tier 4: Multi-Region (100K–1M users)

**Trigger:** > 200ms sync latency for distant regions.

- Read replicas in 2–3 regions (US, EU, APAC)
- Regional PowerSync instances with geo-routing
- CDN for static assets and AI models

### CDN Architecture

```
CDN Layers:
1. Static Assets (any tier) — web bundle, icons, fonts
2. AI Model Artifacts (V2+) — TFLite, CoreML, ONNX, WASM
3. API Response Caching (Tier 2+) — exchange rates, institution lists

Provider: Cloudflare (free tier for Tier 1–2; $20/mo Pro for Tier 3+)
```

### Connection Pooling

```
PgBouncer:
  pool_mode = transaction
  max_client_conn = 1000
  default_pool_size = 50
  reserve_pool_size = 10
  server_idle_timeout = 600
```

## Alternatives Considered

### Alternative 1: Application-Level Sharding

- **Pros:** No extension dependency; full control over routing.
- **Cons:** Shard routing in every query path; scatter-gather for cross-shard queries; significant engineering effort.

### Alternative 2: NoSQL (DynamoDB / MongoDB)

- **Pros:** Native horizontal scaling.
- **Cons:** Loses SQL aggregations essential for finance; breaks PowerSync; invalidates RLS policies; full rewrite.

### Alternative 3: Kubernetes from the Start

- **Pros:** Automated scaling, self-healing, service mesh.
- **Cons:** ~$50–100/mo minimum overhead; massive operational complexity; overkill until Tier 3+.

## Consequences

### Positive

- **No rewrite** — Each tier builds on previous; Citus extends PostgreSQL
- **Edge-first multiplier** — Server handles 10x fewer requests per user
- **Natural shard key** — `household_id` requires zero application changes
- **Cost-proportional** — $10–20/mo at Tier 1, $100–200/mo at Tier 3

### Negative

- **Citus dependency** — Mitigated: open-source, available on Azure
- **Growing operational complexity** — Each tier adds monitoring surface
- **Cross-shard admin queries** — Scatter-gather for global analytics

### Risks

| Risk                               | Likelihood | Impact | Mitigation                                      |
| ---------------------------------- | ---------- | ------ | ----------------------------------------------- |
| Premature scaling                  | Medium     | Low    | Strict tier triggers; don't advance early       |
| Citus + Supabase compatibility     | Medium     | Medium | Test before Tier 3; fallback: app-level routing |
| PowerSync horizontal not supported | Low        | High   | PowerSync Cloud managed; self-hosted: sticky    |

## Implementation Notes

### Monitoring Triggers

```yaml
tier_1_to_2:
  - postgresql_connections_active > 80 for 1h
  - sync_lag_seconds_p95 > 5 for 30m
  - vps_cpu_percent > 70 for 2h

tier_2_to_3:
  - postgresql_write_latency_p95_ms > 50 for 1h
  - powersync_websocket_connections > 8000
```

### Migration Path

```
Tier 1→2: Add streaming replication, point reads to replica
Tier 2→3: Install Citus, create_distributed_table, rebalance
```

## References

- [ADR-0002: Backend & Sync Architecture](./0002-backend-sync-architecture.md)
- [ADR-0007: Hosting Strategy](./0007-hosting-strategy.md)
- [Citus Documentation](https://docs.citusdata.com/)
- [PgBouncer](https://www.pgbouncer.org/)
- [PowerSync Self-Hosted](https://docs.powersync.com/self-hosting)
- [Cloudflare CDN](https://www.cloudflare.com/cdn/)
