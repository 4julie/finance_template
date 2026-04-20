# Competitive Positioning Document

> **Issue:** [#837](https://github.com/jrmoulckers/finance/issues/837)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 1
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Product Identity § 9](../design/product-identity.md) · [Brand Voice Guide](brand-voice-guide.md) · [ASO Research](aso-keyword-research.md)

---

## Table of Contents

1. [Market Landscape](#1-market-landscape)
2. [Competitor Deep Dives](#2-competitor-deep-dives)
3. [Feature Comparison Matrix](#3-feature-comparison-matrix)
4. [Privacy Comparison](#4-privacy-comparison)
5. [Pricing Comparison](#5-pricing-comparison)
6. [Finance's Positioning](#6-finances-positioning)
7. [Why Finance One-Pager](#7-why-finance-one-pager)
8. [Who Finance Is NOT For](#8-who-finance-is-not-for)
9. [Messaging Angles by Audience](#9-messaging-angles-by-audience)
10. [Competitive Response Playbook](#10-competitive-response-playbook)

---

## 1. Market Landscape

### Personal Finance App Categories

| Category                         | Description                                             | Example Apps                   | Finance's Position                                    |
| -------------------------------- | ------------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| **Budgeting (manual-first)**     | Envelope/zero-based budgeting, manual transaction entry | YNAB, Goodbudget               | ✅ Primary category                                   |
| **Aggregators (bank-connected)** | Pull transactions from banks via Plaid/MX               | Monarch, Copilot, Rocket Money | Adjacent — Finance doesn't require bank connection    |
| **Expense trackers**             | Simple logging without budgeting methodology            | Wallet, Money Manager          | ✅ Overlapping — Finance does this but adds budgeting |
| **Investment trackers**          | Portfolio management, stock tracking                    | Personal Capital, Empower      | ❌ Not Finance's space                                |
| **Bill managers**                | Subscription and bill tracking                          | Rocket Money, Truebill         | Partial overlap via recurring transactions            |

### Market Trends (2025)

- **Post-Mint vacuum:** Mint shut down in early 2024. Millions of users are looking for alternatives. Most moved to bank-connected apps (Monarch, Copilot) — privacy-conscious users remain underserved.
- **Privacy awareness growing:** Post-GDPR, more people ask "where does my data go?" before downloading financial apps. Privacy-first is a growing differentiator, not a niche.
- **Subscription fatigue:** YNAB's price increase ($14.99/mo from $6.99/mo) caused significant user backlash. A genuinely free core offering is now a competitive advantage.
- **Cognitive accessibility emerging:** ADHD/neurodivergent communities are vocal about apps not designed for their needs. This is an underserved market with high word-of-mouth potential.
- **Offline-first gaining traction:** With intermittent connectivity worldwide and growing "digital minimalism" trends, offline-capable apps are valued more.

---

## 2. Competitor Deep Dives

### YNAB (You Need A Budget)

**Pricing:** $14.99/month or $109/year (no free tier; 34-day trial)
**Platforms:** Web app + mobile (React Native wrapper, not native)
**Business model:** Subscription

| Strength                                | Weakness                                                |
| --------------------------------------- | ------------------------------------------------------- |
| Strong budgeting methodology (4 Rules)  | Expensive — significant price increases alienated users |
| Loyal community and educational content | Web-based UI — not native feeling on any platform       |
| Bank connection via Plaid               | Requires bank connection for best experience            |
| Years of brand recognition              | No offline mode — requires internet                     |
| Import/export capabilities              | Learning curve is steep for beginners                   |
| Active subreddit community              | No cognitive accessibility features                     |

**Finance's differentiators vs. YNAB:**

- Free forever (core) vs. $14.99/mo
- Native on every platform vs. web wrapper
- Offline-first vs. requires internet
- Privacy-first (on-device encryption) vs. server-stored data
- Adapts to comfort level vs. steep learning curve
- ADHD-friendly design vs. information-dense UI

**How to position:** "The budgeting methodology you love, without the subscription or the learning curve."

---

### Monarch Money

**Pricing:** $9.99/month or $99.99/year (limited free tier)
**Platforms:** Web app + iOS + Android (not native — React Native)
**Business model:** Subscription

| Strength                        | Weakness                                              |
| ------------------------------- | ----------------------------------------------------- |
| Modern, clean UI design         | Requires Plaid bank connection for core functionality |
| Couples/shared finance features | Monthly subscription cost                             |
| Investment tracking included    | No offline capability                                 |
| Growing post-Mint migration     | Not native on any platform                            |
| Good data visualization         | Financial data stored on Monarch's servers            |
| Responsive customer support     | No accessibility-specific features                    |

**Finance's differentiators vs. Monarch:**

- No bank connection required vs. Plaid-dependent
- On-device encrypted data vs. server-stored
- Native per platform vs. React Native
- Works offline vs. requires internet
- Free core vs. $9.99/mo
- Cognitive accessibility vs. standard UI

**How to position:** "Financial clarity without handing your bank password to a third party."

---

### Copilot

**Pricing:** $14.99/month or $119.99/year (no free tier; 1-month trial)
**Platforms:** iOS only (native SwiftUI)
**Business model:** Subscription

| Strength                     | Weakness                               |
| ---------------------------- | -------------------------------------- |
| Beautiful native iOS design  | iOS only — no Android, Windows, or Web |
| Auto-categorization via AI   | Requires bank connection (Plaid)       |
| Excellent data visualization | Expensive                              |
| Apple ecosystem integration  | Financial data on Copilot's servers    |
| Investment tracking          | No offline support                     |
| Responsive development team  | Limited to Apple ecosystem             |

**Finance's differentiators vs. Copilot:**

- Multi-platform (4 platforms) vs. iOS only
- No bank connection vs. Plaid-dependent
- On-device encryption vs. server-stored
- Free core vs. $14.99/mo
- Works offline vs. requires internet
- Open source (BSL) vs. proprietary

**How to position:** "Beautiful and native — on every platform, not just iOS."

---

### Goodbudget

**Pricing:** Free tier (limited) + $10/month or $80/year
**Platforms:** Web + iOS + Android
**Business model:** Freemium

| Strength                       | Weakness                                             |
| ------------------------------ | ---------------------------------------------------- |
| Free tier available            | Free tier severely limited (20 envelopes, 1 account) |
| Envelope budgeting methodology | Dated UI design                                      |
| No bank connection required    | No offline support on web                            |
| Family sharing features        | Not native on mobile                                 |
| Long track record              | Limited reporting                                    |
| Accessible pricing             | No privacy-focused features                          |

**Finance's differentiators vs. Goodbudget:**

- Modern, native UI vs. dated design
- Truly free (no artificial limits) vs. artificially limited free tier
- On-device encryption vs. server-stored
- Offline-first vs. limited offline
- Expertise-tiered UI vs. one-size-fits-all
- Native Windows app vs. none

**How to position:** "Envelope budgeting, modernized — with real privacy and no artificial limits."

---

### PocketGuard

**Pricing:** Free tier + $12.99/month or $74.99/year (PocketGuard Plus)
**Platforms:** iOS + Android
**Business model:** Freemium + subscription

| Strength                        | Weakness                     |
| ------------------------------- | ---------------------------- |
| "In My Pocket" spending feature | Requires bank connection     |
| Bill negotiation service        | Collects extensive user data |
| Clean budget overview           | Free tier has ads            |
| Good onboarding flow            | Server-stored financial data |
| Automatic categorization        | No web or desktop app        |
| Bill tracking                   | No offline capability        |

**Finance's differentiators vs. PocketGuard:**

- No ads ever vs. ad-supported free tier
- No data collection vs. extensive data use
- 4 platforms vs. 2 platforms
- On-device encryption vs. server-stored
- Works offline vs. online-only
- No bank connection required vs. bank-dependent

**How to position:** "Track spending without the ads, the data collection, or the bank connection."

---

## 3. Feature Comparison Matrix

| Feature                         | Finance     | YNAB     | Monarch     | Copilot       | Goodbudget      | PocketGuard   |
| ------------------------------- | ----------- | -------- | ----------- | ------------- | --------------- | ------------- |
| **Offline-first**               | ✅          | ❌       | ❌          | ❌            | Partial         | ❌            |
| **On-device encryption**        | ✅ AES-256  | ❌       | ❌          | ❌            | ❌              | ❌            |
| **No bank connection needed**   | ✅          | ✅       | ❌          | ❌            | ✅              | ❌            |
| **Envelope budgeting**          | ✅          | ✅       | ❌          | ❌            | ✅              | ❌            |
| **Goal tracking**               | ✅          | ✅       | ✅          | ✅            | ❌              | ❌            |
| **Reports / analytics**         | ✅          | ✅       | ✅          | ✅            | Basic           | Basic         |
| **Multi-platform native**       | ✅ (4)      | ❌ (web) | ❌ (web+RN) | ❌ (iOS only) | ❌ (web+hybrid) | ❌ (2 mobile) |
| **Expertise-tiered UI**         | ✅          | ❌       | ❌          | ❌            | ❌              | ❌            |
| **ADHD / cognitive-friendly**   | ✅          | ❌       | ❌          | ❌            | ❌              | ❌            |
| **Reduced motion**              | ✅          | ❌       | ❌          | ❌            | ❌              | ❌            |
| **Dynamic Type / font scaling** | ✅          | Partial  | ❌          | ✅            | ❌              | Partial       |
| **CVD-safe charts**             | ✅          | ❌       | ❌          | ❌            | ❌              | ❌            |
| **Free tier (complete)**        | ✅          | ❌       | Limited     | ❌            | Limited         | Ad-supported  |
| **Household sharing**           | Premium     | ❌       | ✅          | ❌            | ✅              | ❌            |
| **Bank connections**            | Future      | ✅       | ✅          | ✅            | ❌              | ✅            |
| **AI categorization**           | Premium     | ❌       | ✅          | ✅            | ❌              | ✅            |
| **Investment tracking**         | Future      | ❌       | ✅          | ✅            | ❌              | ❌            |
| **Source-available code**       | ✅ BSL      | ❌       | ❌          | ❌            | ❌              | ❌            |
| **Data export**                 | ✅ JSON+CSV | ✅ CSV   | ✅ CSV      | ✅ CSV        | ✅ CSV          | ❌            |

---

## 4. Privacy Comparison

This section maps marketing claims to specific technical implementations.

### Data Storage & Encryption

| Aspect                       | Finance                         | YNAB                    | Monarch                    | Copilot                | Goodbudget         |
| ---------------------------- | ------------------------------- | ----------------------- | -------------------------- | ---------------------- | ------------------ |
| **Where data lives**         | On your device (SQLCipher)      | YNAB servers            | Monarch servers            | Copilot servers        | Goodbudget servers |
| **Encryption at rest**       | AES-256 (SQLCipher)             | Server-side encryption  | Server-side encryption     | Server-side encryption | Unknown            |
| **End-to-end encryption**    | Hybrid E2E for sensitive fields | ❌                      | ❌                         | ❌                     | ❌                 |
| **Bank connection**          | Not required (ever)             | Optional but encouraged | Required for core features | Required               | Not offered        |
| **Third-party data sharing** | None                            | Plaid (for bank sync)   | Plaid (required)           | Plaid (required)       | None               |

**Technical verification of Finance claims:**

- Local encryption: SQLCipher AES-256 — verified in `packages/models/src/*/DatabaseFactory.*.kt`
- E2E for sensitive fields: Envelope encryption pattern — documented in ADR-0004 § 6
- No server data without opt-in sync: Edge-first architecture — documented in `docs/architecture/overview.md` § 4
- Key storage: Platform Keychain/Keystore — documented in ADR-0004 § 5

### Data Collection

| Data Point                 | Finance              | YNAB          | Monarch       | Copilot       | PocketGuard      |
| -------------------------- | -------------------- | ------------- | ------------- | ------------- | ---------------- |
| **Financial transactions** | On-device only       | Their servers | Their servers | Their servers | Their servers    |
| **Bank credentials**       | Never collected      | Via Plaid     | Via Plaid     | Via Plaid     | Via Plaid        |
| **Usage analytics**        | None without consent | Yes           | Yes           | Yes           | Yes              |
| **Ad tracking**            | Never                | No            | No            | No            | Yes (free tier)  |
| **Sells/shares data**      | Never                | No (stated)   | No (stated)   | No (stated)   | Yes (aggregated) |

### Privacy Marketing Claims — Accuracy Matrix

| Claim                               | Technical Basis                       | Status                                                                                |
| ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| "Data encrypted on your device"     | SQLCipher AES-256 for local DB        | ✅ Verified                                                                           |
| "Works without internet"            | Edge-first architecture, local SQLite | ✅ Verified                                                                           |
| "No bank connection required"       | Manual-entry-first design             | ✅ Verified                                                                           |
| "We can't read your financial data" | Hybrid E2E for sensitive fields       | ⚠️ Partially verified — metadata (categories, timestamps) is server-readable for sync |
| "No tracking"                       | No analytics SDK in codebase          | ✅ Verified (as of current codebase)                                                  |
| "Source-available"                  | GitHub repo under BSL-1.1             | ✅ Verified                                                                           |

**Note:** The claim "We can't read your financial data" should be nuanced. Accurate phrasing: "Sensitive financial data (amounts, balances, notes) is encrypted end-to-end. Metadata needed for sync (timestamps, categories) is server-readable when you opt into sync." See ADR-0004 § 6.

---

## 5. Pricing Comparison

| App             | Free Tier               | Premium   | Annual     | Family           |
| --------------- | ----------------------- | --------- | ---------- | ---------------- |
| **Finance**     | ✅ Complete tracker     | ~$4.99/mo | ~$39.99/yr | TBD              |
| **YNAB**        | ❌ 34-day trial only    | $14.99/mo | $109/yr    | N/A              |
| **Monarch**     | Limited features        | $9.99/mo  | $99.99/yr  | Included         |
| **Copilot**     | ❌ 1-month trial only   | $14.99/mo | $119.99/yr | N/A              |
| **Goodbudget**  | 20 envelopes, 1 account | $10/mo    | $80/yr     | Included in Plus |
| **PocketGuard** | Ad-supported, basic     | $12.99/mo | $74.99/yr  | N/A              |

### Finance's Pricing Advantage

- **Most complete free tier** — No artificial envelope limits, no account limits, no trial expiration
- **Lowest premium price** — ~$4.99/mo (proposed) is 50–67% less than competitors
- **No bank-connection cost** — Finance doesn't have Plaid fees (~$0.30/connection/month), enabling a sustainably lower price
- **Value of premium is clear** — AI insights + sync + sharing are genuine value additions, not features withheld from free

---

## 6. Finance's Positioning

### Primary Positioning Statement

> For people who want to understand their finances without giving up their privacy, Finance is a multi-platform budget tracker that works offline, encrypts data on your device, and adapts to your comfort level with money. Unlike YNAB, Monarch, and Copilot, Finance doesn't require a bank connection, keeps your financial data off corporate servers, and offers a genuinely complete free tier.

### Three Pillars of Differentiation

#### Pillar 1: Privacy Without Compromise

> "Your money, your device. Most budget apps upload your transactions to their servers and connect to your bank via third parties. Finance keeps everything encrypted on your device. Sync is optional. Bank connections are never required. We make money from optional subscriptions, not your data."

**Technical basis:** SQLCipher AES-256, hybrid E2E encryption, edge-first architecture

#### Pillar 2: Designed for Every Brain

> "Finance is the first budget app designed for cognitive accessibility from the ground up. Three expertise tiers adapt the entire experience to your comfort level. Simplified views for when you need less. Full detail when you want more. Reduced motion, non-judgmental language, and gentle reminders — designed with ADHD and cognitive accessibility in mind."

**Technical basis:** Expertise-tiered UI system, `prefers-reduced-motion` support, Tiimo-inspired design principles

#### Pillar 3: Native Everywhere, Free to Start

> "Finance is built natively for each platform — SwiftUI on iOS, Jetpack Compose on Android, React for Web, Compose Desktop for Windows. It's not a web view in a native wrapper. The complete financial tracker is free forever — accounts, transactions, budgets, goals, reports. No trial. No artificial limits."

**Technical basis:** KMP shared logic with platform-native UI frameworks, BSL source-available license

---

## 7. Why Finance One-Pager

> _(For press kit, landing page, and investor conversations)_

### Why Finance?

**The problem:** Most personal finance apps require your bank password, upload your financial data to remote servers, and charge $10–15/month for features that should be free. They're designed for one type of user — and that type isn't you if you're privacy-conscious, neurodivergent, or on a budget.

**Our approach:** Finance is a multi-platform budget tracker that takes a fundamentally different approach:

| What Others Do                          | What Finance Does                                 |
| --------------------------------------- | ------------------------------------------------- |
| Upload your data to their servers       | Encrypt everything on your device                 |
| Require bank connections                | Work with manual entry (bank sync never required) |
| Charge $10–15/month for basic budgeting | Free forever for the complete tracker             |
| One-size-fits-all UI                    | Adapts to your comfort level (3 expertise tiers)  |
| Web views in native shells              | Truly native UI on each platform                  |
| Require internet to function            | Work fully offline                                |
| Use guilt-based notifications           | Present facts without judgment                    |

**Who it's for:**

- People who want to track spending without sharing data with third parties
- People overwhelmed by complex finance apps (ADHD-friendly design)
- People looking for a free, no-strings-attached budgeting tool
- People who use multiple platforms (iOS + Windows, Android + Web)
- Privacy advocates who read privacy policies

**Who it's NOT for:** See Section 8.

**The team:** Finance is developed as an open-source (BSL-1.1) project with AI-assisted development. The codebase is fully transparent — you can read every line of code that handles your financial data.

**Business model:** Free forever core. Optional premium ($4.99/mo proposed) for AI insights, multi-device sync, and household sharing. Revenue comes from subscriptions, never from data.

---

## 8. Who Finance Is NOT For

Honesty builds trust. Finance is intentionally not designed for everyone:

| Audience                                                | Why Finance Isn't the Best Fit                                                  | What to Recommend Instead  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------- |
| People who need automatic bank transaction imports      | Finance is manual-entry-first (bank connections are a future feature, not core) | Monarch, Copilot           |
| Active investors needing portfolio tracking             | Finance focuses on budgeting and spending, not investment management            | Empower (Personal Capital) |
| Businesses needing invoicing, payroll, or tax reporting | Finance is for personal finance, not business accounting                        | QuickBooks, Wave           |
| People who want AI to fully manage their finances       | Finance's AI features are supplementary, not autonomous                         | Cleo, Rocket Money         |
| People who need multi-currency real-time conversion     | Multi-currency is a future feature, not in the current release                  | Wise, Revolut              |

---

## 9. Messaging Angles by Audience

### For Privacy-Conscious Users (r/privacy, HN, DuckDuckGo users)

> **Lead with:** Architecture — SQLCipher, edge-first, no analytics SDK, BSL license
> **Key message:** "Read our code. Your financial data is encrypted on-device with AES-256. No telemetry. No Plaid. No bank connections required."
> **Proof points:** Link to GitHub repo, ADR-0004, privacy audit

### For YNAB Refugees (r/ynab, budgeting communities)

> **Lead with:** Methodology compatibility + price
> **Key message:** "Same envelope budgeting philosophy. Free core app. Works offline. No $14.99/month."
> **Proof points:** Feature comparison table, free tier details

### For ADHD / Neurodivergent Communities (r/adhd, accessibility spaces)

> **Lead with:** Cognitive accessibility design
> **Key message:** "A budget app that works with your brain. Simplified views, gentle reminders, reduced motion, non-judgmental language."
> **Proof points:** Expertise tier screenshots, Casey persona story

### For Developers / Technical Audience (HN, GitHub, dev communities)

> **Lead with:** Technical architecture — KMP, SQLDelight, PowerSync, BSL
> **Key message:** "Multi-platform financial app built with KMP, SQLCipher, and PowerSync. Source-available. Contributions welcome."
> **Proof points:** GitHub repo, architecture docs, tech stack breakdown

### For General Audience (App Store browsers, social media)

> **Lead with:** Speed + simplicity + free
> **Key message:** "Track spending in 30 seconds. Free forever. Works offline. Your data stays on your device."
> **Proof points:** Screenshots, feature list, App Store reviews

---

## 10. Competitive Response Playbook

### If a competitor launches a privacy feature

- **Response:** Welcome the trend. "We're glad to see more apps prioritizing privacy. Finance was built privacy-first from day one — not as an add-on. Here's how our architecture differs: [link to docs]."
- **Don't:** Attack or dismiss their effort.

### If a competitor drops their price or adds a free tier

- **Response:** Highlight the depth of Finance's free tier. "Finance's free tier includes [full feature list]. No artificial limits. No trial expiration."
- **Don't:** Engage in a price war or change pricing reactively.

### If a competitor criticizes Finance

- **Response:** Respond factually and graciously. Correct inaccuracies with links to documentation. Acknowledge legitimate criticisms.
- **Don't:** Escalate or make it personal.

### If asked "Why should I switch from X?"

- **Response:** "We're not here to convince anyone to switch. Finance is built for people who value privacy, offline access, and cognitive accessibility. If those matter to you, we'd love for you to try it — the core is free, so there's no cost to explore."
- **Don't:** Aggressively sell against competitors.

---

## References

- [Product Identity § 9](../design/product-identity.md) — Initial competitive comparison table
- [Brand Voice Guide](brand-voice-guide.md) — Tone for competitive messaging
- [ADR-0004: Auth & Security](../architecture/0004-auth-security-architecture.md) — Privacy claims technical basis
- [ADR-0003: Local Storage](../architecture/0003-local-storage-strategy.md) — SQLCipher implementation
- [Architecture Overview](../architecture/overview.md) — Edge-first architecture claims
- [Privacy Audit v1](../architecture/privacy-audit-v1.md) — Current compliance status

---

**Disclaimer:** Competitor pricing, features, and policies are based on publicly available information as of July 2025. Verify current details before publishing any comparison.
