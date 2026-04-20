# ADR-0010: V2 Architecture Vision — Bank Connections, AI Features, Multi-Currency

**Status:** Proposed
**Date:** 2025-07-27
**Author:** System Architect (AI agent)
**Reviewers:** Pending human review
**Sprint:** S8

## Context

Finance V1 delivers a fully functional offline-first financial tracker with manual transaction entry, CSV import, household sharing, and multi-platform support (iOS, Android, Web, Windows). As the product matures toward V2, three major capability areas demand architectural planning:

1. **Bank connections** — Automated transaction ingestion via Plaid, GoCardless, or similar aggregators. This is the #1 user-requested feature for reducing friction in daily tracking.
2. **AI-powered features** — Intelligent categorization, spending anomaly detection, natural-language transaction search, and personalized financial insights. These are the premium tier differentiators (see ADR-0009 freemium model).
3. **Multi-currency first-class support** — Real-time exchange rates, multi-currency portfolio views, cross-currency budget tracking, and automatic conversion for households spanning multiple countries.

### Architectural Tension

V2 features introduce a fundamental tension with the V1 edge-first principle:

| Capability                 | Edge-viable? | Why                                                                           |
| -------------------------- | ------------ | ----------------------------------------------------------------------------- |
| Bank connection OAuth      | ❌ Server    | Aggregators require server-to-server API calls with institutional credentials |
| Transaction ingestion      | ❌ Server    | Webhooks from aggregators arrive at a server endpoint                         |
| AI categorization          | ✅ On-device | Small models (< 50 MB) run efficiently on modern mobile hardware              |
| Anomaly detection          | ✅ On-device | Statistical analysis over local transaction history                           |
| NLP search                 | ⚠️ Hybrid    | Simple search on-device; advanced semantic search requires embedding models   |
| Exchange rate fetching     | ❌ Server    | API calls to rate providers (ECB, Fixer, Open Exchange Rates)                 |
| Currency conversion        | ✅ On-device | Computation over cached rates                                                 |
| Multi-currency aggregation | ✅ On-device | Local computation once rates are available                                    |

The server must expand beyond a "thin sync layer" for V2, but the expansion must be **surgical** — only capabilities that physically cannot run on the client should move server-side.

### Constraints

- V2 must not break V1 offline functionality — all existing features must continue to work without a network connection
- Bank connections involve regulated financial data (PSD2, PCI DSS awareness) and must not weaken the privacy posture
- AI models must be small enough for on-device inference (< 100 MB per model, < 50 ms inference latency)
- Multi-currency must handle 150+ ISO 4217 currencies with sub-second conversion
- The self-hosted VPS ($10–20/mo, see ADR-0007) must absorb V2 workloads without requiring a 10x cost increase

## Decision

Adopt a **capability-layered V2 architecture** where each new feature area operates through a well-defined boundary between edge and server responsibilities.

### 1. Bank Connection Architecture

```
┌─────────────────────────────────────┐
│              Client                  │
│  ┌──────────────────────────────┐   │
│  │  Bank Connection Manager      │   │
│  │  (packages/core/banking/)     │   │
│  │  • Launch Link/Connect widget │   │
│  │  • Display account list       │   │
│  │  • Match ingested → local txn │   │
│  │  • Deduplicate transactions   │   │
│  └───────────┬──────────────────┘   │
└──────────────┼───────────────────────┘
               │ HTTPS (OAuth redirect)
┌──────────────▼───────────────────────┐
│         Server — Banking Edge Fn      │
│  ┌─────────────────────────────────┐ │
│  │  Plaid / GoCardless Adapter     │ │
│  │  • /api/banking/link-token       │ │
│  │  • /api/banking/exchange-token   │ │
│  │  • /api/banking/webhook          │ │
│  │  • /api/banking/sync             │ │
│  └──────────────┬──────────────────┘ │
│  ┌──────────────▼──────────────────┐ │
│  │  Transaction Staging Table       │ │
│  │  (bank_transactions)             │ │
│  │  • Raw ingested data             │ │
│  │  • NOT in main transactions tbl  │ │
│  │  • Household-scoped via RLS      │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**Key design decisions:**

- **Staging table pattern** — Bank-ingested transactions land in a `bank_transactions` staging table, not directly in the user's `transactions` table. The client pulls staged transactions via sync and presents them for review/approval. This preserves user agency and prevents phantom transactions.
- **Aggregator abstraction** — A `BankingProvider` interface abstracts Plaid, GoCardless, TrueLayer, and future providers. The server adapter translates provider-specific responses into a canonical `BankTransaction` format.
- **Credential isolation** — Aggregator API keys and access tokens are stored server-side only, never transmitted to clients. Bank account tokens are encrypted at rest with a per-household KEK (see ADR-0004 key hierarchy).
- **Webhook-driven ingestion** — The server receives webhooks from aggregators when new transactions are available, fetches them, and writes to the staging table. PowerSync then syncs the staged transactions to clients.
- **Regional provider strategy** — Plaid for North America, GoCardless/TrueLayer for Europe (PSD2-compliant), with a provider selection layer based on user's region.

### 2. AI Feature Architecture

```
┌──────────────────────────────────────────────────────────┐
│                          Client                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  AI Engine (packages/core/ai/)                       │ │
│  │  ┌───────────────┐  ┌────────────────────────────┐  │ │
│  │  │ On-Device      │  │ Insight Generator           │  │ │
│  │  │ Model Runtime  │  │ • Spending anomaly detection │  │ │
│  │  │ • TFLite (And) │  │ • Budget pacing alerts       │  │ │
│  │  │ • CoreML (iOS) │  │ • Savings goal projections   │  │ │
│  │  │ • ONNX (Win)   │  │ • Category suggestions       │  │ │
│  │  │ • WASM (Web)   │  │                              │  │ │
│  │  └───────┬───────┘  └──────────────────────────────┘  │ │
│  │  ┌───────▼─────────────────────────────────────────┐  │ │
│  │  │ Model Registry                                   │  │ │
│  │  │ • Version management + Background download       │  │ │
│  │  │ • A/B model switching                            │  │ │
│  │  │ • Fallback to rule-based when model unavailable  │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
│  Privacy: NO transaction data leaves device for inference │
└──────────────────────────────────────────────────────────┘
```

**AI feature tiers:**

| Feature                    | Tier                        | Approach                          | Model Size |
| -------------------------- | --------------------------- | --------------------------------- | ---------- |
| Auto-categorization        | Free (basic) / Premium (ML) | Rule-based free; ML model premium | ~15 MB     |
| Spending anomaly detection | Premium                     | Statistical + lightweight ML      | ~5 MB      |
| Natural-language search    | Premium                     | On-device embedding model         | ~30 MB     |
| Financial health score     | Free                        | Rule-based algorithm              | No model   |
| Predictive budgeting       | Premium                     | Time-series forecasting           | ~10 MB     |
| Receipt OCR                | Premium                     | On-device vision model            | ~20 MB     |

**Privacy guarantee:** Transaction data never leaves the device for AI inference. Models are downloaded to the device; inference runs locally. This is the architectural equivalent of Signal's approach — the server never sees the content.

### 3. Multi-Currency Architecture

```
┌──────────────────────────────────────────────┐
│                    Client                     │
│  ┌─────────────────────────────────────────┐ │
│  │  Currency Engine                         │ │
│  │  (packages/core/currency/ — enhanced)    │ │
│  │  • CurrencyConverter (existing, enhanced)│ │
│  │  • MultiCurrencyAggregator (new)         │ │
│  │  • ExchangeRateCache (new)               │ │
│  │  • HistoricalRateStore (new)             │ │
│  └──────────────┬──────────────────────────┘ │
│  Local rate cache: synced via PowerSync       │
└─────────────────┼────────────────────────────┘
                  │ Sync (PowerSync)
┌─────────────────▼────────────────────────────┐
│           Server — Rate Service                │
│  ┌──────────────────────────────────────────┐ │
│  │  Exchange Rate Worker (Edge Function)     │ │
│  │  • Cron: fetch rates every 4h from ECB    │ │
│  │  • Write to exchange_rates table           │ │
│  │  • Historical rates for reporting          │ │
│  │  • Fallback providers (Fixer, OER)         │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Rate table in sync scope** — Exchange rates sync to clients via PowerSync as a new `global_data` bucket (not household-scoped). Offline conversion uses last-synced rates.
- **Historical rates** — Every rate update preserved for accurate historical reporting. Transaction conversion uses the rate effective on the transaction date.
- **Display currency** — Per-user preference. All aggregation views convert to display currency.
- **Multi-currency accounts** — Accounts have `currency_code`. Cross-currency transfers generate two linked transactions with conversion rate recorded.

### V2 Server Expansion Model

```
V1 Server (thin sync):
├── Supabase Auth + PostgreSQL + RLS + PowerSync

V2 additions (compartmentalized):
├── Banking Edge Functions (link-token, webhook, staging)
├── Rate Worker (ECB cron job every 4h)
├── Model CDN (static file hosting for ML artifacts)
└── New sync bucket: global_data (exchange rates)

Cost impact: ~$2–5/mo additional on self-hosted VPS
```

## Alternatives Considered

### Alternative 1: Full Server-Side AI (Cloud ML)

- **Pros:** Access to large models (GPT-4, Claude); no model size constraints; centralized updates.
- **Cons:** Sends transaction data to third-party API, breaking privacy-first. Cannot work offline. API costs scale unpredictably.

### Alternative 2: Direct Bank API Integration (No Aggregator)

- **Pros:** No aggregator dependency or per-connection fees.
- **Cons:** Each bank has different API. PSD2 AISP registration costs €20K+. Multi-year effort for a small team.

### Alternative 3: Server-Side Multi-Currency Conversion

- **Pros:** Always latest rates. Single source of truth.
- **Cons:** Every conversion requires network call, breaking offline-first. Server becomes bottleneck for most common operation.

## Consequences

### Positive

- **Privacy preserved** — AI on-device, bank credentials server-only, exchange rates are public data
- **Offline-first intact** — V1 features remain fully offline; V2 degrades gracefully
- **Modular expansion** — Each capability independent with clear boundaries
- **Cost-controlled** — ~$2–5/mo additional, not $50+/mo for cloud ML

### Negative

- **Server complexity increases** — No longer a pure sync layer
- **Model management overhead** — 4 platform-specific formats per model version
- **Aggregator dependency** — Bank connections depend on Plaid/GoCardless uptime

### Risks

| Risk                            | Likelihood | Impact | Mitigation                                      |
| ------------------------------- | ---------- | ------ | ----------------------------------------------- |
| Plaid pricing changes           | Medium     | Medium | Aggregator abstraction; evaluate alternatives   |
| On-device model too large       | Medium     | Low    | Size budgets; quantization; rule-based fallback |
| Exchange rate provider downtime | Low        | Low    | Multiple fallback providers; cached rates       |
| V2 server load exceeds VPS      | Low        | Medium | Async webhook processing; scale VPS vertically  |

## Implementation Notes

### New Database Tables

```sql
CREATE TABLE bank_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    provider TEXT NOT NULL, provider_item_id TEXT NOT NULL,
    institution_name TEXT, status TEXT NOT NULL DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id),
    bank_connection_id UUID NOT NULL REFERENCES bank_connections(id),
    account_id UUID REFERENCES accounts(id),
    amount_cents BIGINT NOT NULL, currency_code TEXT NOT NULL,
    description TEXT, merchant_name TEXT, date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    matched_transaction_id UUID REFERENCES transactions(id),
    raw_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ
);

CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency TEXT NOT NULL, target_currency TEXT NOT NULL,
    rate DECIMAL(20, 10) NOT NULL, effective_date DATE NOT NULL,
    source TEXT NOT NULL DEFAULT 'ecb',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (base_currency, target_currency, effective_date, source)
);
```

### New KMP Modules

```
packages/core/src/commonMain/kotlin/com/finance/core/
├── banking/         ← NEW: BankingProvider, TransactionMatcher, DeduplicationEngine
├── ai/              ← NEW: ModelRuntime (expect/actual), ModelRegistry, Categorizer
├── currency/        ← ENHANCED: ExchangeRateCache, MultiCurrencyAggregator, HistoricalRateStore
```

## References

- [ADR-0002: Backend & Sync Architecture](./0002-backend-sync-architecture.md)
- [ADR-0004: Auth & Security Architecture](./0004-auth-security-architecture.md)
- [ADR-0007: Hosting Strategy](./0007-hosting-strategy.md)
- [ADR-0009: Legal & Monetization Analysis](./0009-legal-monetization-analysis.md)
- [Plaid API Documentation](https://plaid.com/docs/)
- [GoCardless Bank Account Data API](https://gocardless.com/bank-account-data/)
- [ECB Exchange Rate API](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/)
- [TensorFlow Lite](https://www.tensorflow.org/lite), [Core ML](https://developer.apple.com/documentation/coreml), [ONNX Runtime](https://onnxruntime.ai/)
