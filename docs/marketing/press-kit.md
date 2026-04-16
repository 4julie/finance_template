# Press Kit

> **Issue:** [#840](https://github.com/jrmoulckers/finance/issues/840)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 2
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Brand Voice Guide](brand-voice-guide.md) · [Competitive Positioning](competitive-positioning.md)

---

## Table of Contents

1. [Press Release — v1.0 Launch](#1-press-release--v10-launch)
2. [Fact Sheet](#2-fact-sheet)
3. [Founder / Team Bio Template](#3-founder--team-bio-template)
4. [Media Assets Inventory](#4-media-assets-inventory)
5. [Press FAQ](#5-press-faq)
6. [Media Contact & Usage Terms](#6-media-contact--usage-terms)

---

## 1. Press Release — v1.0 Launch

**FOR IMMEDIATE RELEASE**
_(Human determines distribution timing)_

---

### Finance Launches Free, Offline-First Budget Tracker Across iOS, Android, Web, and Windows

_Privacy-focused personal finance app keeps all data encrypted on-device; no bank connection required_

**[CITY, DATE]** — Finance, a multi-platform personal budget tracker, launched today across iOS, Android, Web, and Windows. The app takes a fundamentally different approach to personal finance: all financial data is stored and encrypted on the user's device, the app works fully offline, and no bank connection is ever required.

"Most financial apps ask for your bank password and upload your data to their servers," said [Founder Name], creator of Finance. "We built Finance for people who want financial clarity without giving up their privacy. Your spending data stays on your device — we can't read it even if we wanted to."

**Key features:**

- **Offline-first architecture** — The complete app functions without internet. All data is stored locally in an AES-256 encrypted database (SQLCipher).
- **No bank connection required** — Users enter transactions manually via a 3-tap quick entry flow designed to take under 30 seconds.
- **Expertise-tiered interface** — Three comfort levels (Getting Started, Comfortable, Advanced) adapt terminology, feature visibility, and chart complexity to each user's comfort with financial concepts.
- **Cognitive accessibility** — Designed with ADHD and cognitive accessibility in mind: simplified views, reduced motion, non-judgmental language. The app observes and informs — it never judges spending.
- **Native on every platform** — Built with SwiftUI (iOS), Jetpack Compose (Android), React (Web PWA), and Compose Desktop (Windows), not cross-platform web views.
- **Free forever (core features)** — The complete tracker — accounts, transactions, envelope budgets, savings goals, and reports — is free with no trial, no feature walls, and no ads.

**Privacy architecture:**

Finance uses a hybrid end-to-end encryption model. Sensitive financial data (amounts, balances, notes) is encrypted before leaving the device. Encryption keys are stored in platform-native secure hardware: Secure Enclave (iOS), Trusted Execution Environment (Android), Trusted Platform Module (Windows). The codebase is source-available under the Business Source License 1.1, allowing anyone to verify the privacy claims.

**Pricing:**

The core financial tracker is free forever. An optional premium tier (~$4.99/month, ~$39.99/year) adds AI-powered insights, multi-device sync, and household sharing.

**Availability:**

Finance is available now on the [App Store], [Google Play], [Web], and [Microsoft Store].

**About Finance:**

Finance is a source-available personal finance application developed with AI-assisted development practices. The project is maintained at github.com/jrmoulckers/finance under the Business Source License 1.1, converting to Apache License 2.0 in 2030.

**Media contact:** [Contact email]
**Website:** [URL]
**Press kit:** [URL]

---

## 2. Fact Sheet

### Product Overview

| Field            | Detail                                                             |
| ---------------- | ------------------------------------------------------------------ |
| **Product name** | Finance                                                            |
| **Category**     | Personal finance / Budget tracking                                 |
| **Tagline**      | "Your finances, your device, your control."                        |
| **Launch date**  | [TBD — human fills in]                                             |
| **Platforms**    | iOS (iPhone, iPad), Android (phone, tablet), Web (PWA), Windows 11 |
| **Pricing**      | Free (core) / ~$4.99/mo premium / ~$39.99/yr premium               |
| **License**      | Business Source License 1.1 (converts to Apache 2.0 in 2030)       |
| **Source code**  | github.com/jrmoulckers/finance                                     |

### Key Differentiators

| Differentiator              | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| **Offline-first**           | Entire app works without internet. Data stored locally.                   |
| **On-device encryption**    | AES-256 via SQLCipher. Keys in hardware secure elements.                  |
| **No bank connection**      | Manual-entry-first. Bank connections never required.                      |
| **Expertise-tiered UI**     | 3 levels adapt language, features, and complexity.                        |
| **Cognitive accessibility** | ADHD-friendly: simplified views, reduced motion, non-judgmental language. |
| **Native per platform**     | SwiftUI, Jetpack Compose, React, Compose Desktop — not web views.         |
| **Free forever (core)**     | Complete tracker with no trial, no ads, no feature walls.                 |
| **Source-available**        | Verifiable privacy claims — code is public.                               |

### Technology Stack

| Layer          | Technology                             |
| -------------- | -------------------------------------- |
| Shared logic   | Kotlin Multiplatform (KMP)             |
| iOS UI         | SwiftUI                                |
| Android UI     | Jetpack Compose + Material Design 3    |
| Web UI         | React + TypeScript (PWA)               |
| Windows UI     | Compose Desktop                        |
| Local database | SQLDelight + SQLCipher (AES-256)       |
| Sync           | PowerSync (opt-in, encrypted)          |
| Authentication | Passkeys (WebAuthn/FIDO2)              |
| Backend        | Supabase (PostgreSQL + Edge Functions) |
| Design tokens  | Style Dictionary (DTCG format)         |

### By the Numbers

| Metric                 | Value                          |
| ---------------------- | ------------------------------ |
| Platforms supported    | 4 (iOS, Android, Web, Windows) |
| Transaction entry time | <30 seconds (3 taps)           |
| Encryption standard    | AES-256-GCM                    |
| Backend edge functions | 11                             |
| Database migrations    | 7                              |
| WCAG target            | 2.2 AA                         |
| Price (core)           | $0 / forever                   |

### Target Audience

- Privacy-conscious individuals who want financial tracking without data sharing
- People with ADHD or cognitive accessibility needs who find existing apps overwhelming
- Budget-conscious users looking for a free, capable alternative to YNAB ($14.99/mo) or Monarch ($9.99/mo)
- Multi-platform users who need native apps on iOS, Android, Web, and Windows
- Envelope budgeting practitioners looking for a modern, offline-capable tool

---

## 3. Founder / Team Bio Template

_(Human fills in personal details)_

### [Founder Name]

**Role:** Creator & Lead Developer

[Founder Name] is the creator of Finance, a privacy-first personal budget tracker. [He/She/They] built Finance to address a gap in the personal finance market: the lack of a capable, free budgeting tool that keeps financial data on the user's device.

[Optional: 1–2 sentences of personal background — education, previous work, motivation]

Finance is developed using AI-assisted development practices, with the entire process documented publicly. The codebase is source-available under the Business Source License 1.1.

**Contact:** [email]
**GitHub:** [profile link]
**LinkedIn:** [profile link]

---

## 4. Media Assets Inventory

### Available Assets

| Asset                     | Format    | Dimensions    | Status               |
| ------------------------- | --------- | ------------- | -------------------- |
| App icon (iOS)            | PNG       | 1024×1024     | [Available / TBD]    |
| App icon (Android)        | PNG       | 512×512       | [Available / TBD]    |
| App icon (Web)            | SVG + PNG | Various       | [Available / TBD]    |
| Logo (wordmark)           | SVG + PNG | Various       | [TBD — needs design] |
| Logo (icon only)          | SVG + PNG | Various       | [TBD — needs design] |
| Screenshots (iOS)         | PNG       | 1320×2868     | Sprint 3 deliverable |
| Screenshots (Android)     | PNG       | 1080×1920+    | Sprint 3 deliverable |
| Screenshots (Web)         | PNG       | 1200×630 (OG) | Sprint 3 deliverable |
| Screenshots (Windows)     | PNG       | 1920×1080     | Sprint 3 deliverable |
| Feature graphic (Android) | PNG       | 1024×500      | Sprint 3 deliverable |
| Banner image              | PNG       | 1200×630      | [TBD]                |
| Product Hunt gallery      | PNG       | 1270×760      | Sprint 4 deliverable |

### Usage Guidelines

- **Do:** Use provided assets at specified dimensions; use on light or dark backgrounds as provided
- **Do:** Credit "Finance" (not "Finance App" or other variations) in editorial copy
- **Don't:** Modify the logo colors, proportions, or add effects
- **Don't:** Use the logo to imply endorsement
- **License:** Media assets are provided for editorial use in connection with coverage of Finance. All rights reserved.

---

## 5. Press FAQ

### Product Questions

**Q: What is Finance?**
A: Finance is a multi-platform personal budget tracker that works offline and keeps all financial data encrypted on the user's device. It supports envelope budgeting, goal tracking, and financial reporting across iOS, Android, Web, and Windows.

**Q: How is Finance different from YNAB, Monarch, or Copilot?**
A: Finance differs in three key ways: (1) All data is stored and encrypted on the user's device — not on our servers, (2) No bank connection is ever required — manual entry is the primary flow, (3) The complete tracker is free forever — accounts, transactions, budgets, goals, and reports, with no trial or feature walls. See our [competitive positioning document](competitive-positioning.md) for a detailed comparison.

**Q: Does Finance connect to my bank?**
A: Not currently. Finance is manual-entry-first by design. We may add optional bank connections as a future feature, but they will never be required for core functionality.

**Q: Is Finance really free?**
A: Yes. The core financial tracker — including unlimited accounts, transactions, budgets, goals, and reports — is free forever. No trial period, no feature walls, no ads. An optional premium tier (approximately $4.99/month) adds AI-powered insights, multi-device sync, and household sharing for those who want more.

### Privacy & Security Questions

**Q: Where is my data stored?**
A: On your device. Finance uses an offline-first architecture where all financial data is stored in a locally encrypted SQLite database (SQLCipher, AES-256). Data is only sent to a server if you explicitly enable multi-device sync, and even then, sensitive fields are encrypted end-to-end.

**Q: Can you read my financial data?**
A: Sensitive financial data (transaction amounts, account balances, notes) is encrypted end-to-end. We cannot decrypt it. Metadata needed for sync coordination (timestamps, category IDs) is server-readable when sync is enabled, but contains no financial amounts or personal details.

**Q: Do you sell user data?**
A: No. We do not sell, share, or monetize user data in any way. Our revenue model is optional premium subscriptions.

**Q: Do you use analytics or tracking?**
A: No analytics SDK is included in the app. We do not track user behavior, screen views, or usage patterns within the app. Download counts come from app store dashboards, not in-app tracking.

**Q: Can I verify your privacy claims?**
A: Yes. The codebase is source-available on GitHub under the Business Source License 1.1. You can read the encryption implementation, sync protocol, and data handling code. Our security architecture is documented in ADR-0004.

### Business Questions

**Q: How do you make money?**
A: Optional premium subscriptions. The premium tier (approximately $4.99/month or $39.99/year) includes AI-powered categorization, spending forecasts, multi-device sync, and household sharing. The core tracker is free and always will be.

**Q: Why is the core app free?**
A: Two reasons: (1) We believe basic financial tracking shouldn't have a paywall — it's a tool for financial wellness that everyone deserves access to, (2) By not requiring bank connections (Plaid costs approximately $0.30/user/month), we avoid a significant recurring cost that forces other apps to charge more.

**Q: What does "source-available" mean?**
A: Finance is published under the Business Source License 1.1 (BSL). This means anyone can view, fork, and learn from the source code. Personal and non-commercial use is permitted. The license converts to Apache License 2.0 (fully open source) in 2030.

**Q: Is this a venture-funded startup?**
A: [Human to answer — depends on actual business structure]

### Technical Questions

**Q: What technology is Finance built with?**
A: Shared business logic is built with Kotlin Multiplatform (KMP). Each platform uses its native UI framework: SwiftUI (iOS), Jetpack Compose (Android), React + TypeScript (Web), and Compose Desktop (Windows). The local database uses SQLDelight with SQLCipher for encryption.

**Q: How does multi-device sync work?**
A: When enabled, Finance uses PowerSync for delta synchronization. Only changes (not full data sets) are transmitted. Sensitive fields are encrypted end-to-end before transmission. The server sees only sync metadata — not your financial data.

**Q: Is the app AI-generated?**
A: Finance is developed using AI-assisted development practices — AI tools help write code, documentation, and tests, with human review and direction. The full development process is documented publicly. "AI-assisted" means AI is a tool in the development process, not that the app was auto-generated without human judgment.

---

## 6. Media Contact & Usage Terms

### Media Contact

**Name:** [Human fills in]
**Email:** [press@domain or personal email]
**Response time:** Within 24 hours for press inquiries

### Asset Usage Terms

All media assets provided in this press kit are licensed for editorial use in connection with factual coverage of Finance. Assets may not be modified, used in advertising, or used to imply endorsement without written permission.

### Interview Availability

[Founder Name] is available for interviews via email, video call, or phone. Please contact [email] to schedule.

### Embargo Policy

Press releases and materials may be shared under embargo upon request. Please contact the media contact above to discuss timing.

---

## References

- [Brand Voice Guide](brand-voice-guide.md) — Tone for all press materials
- [Competitive Positioning](competitive-positioning.md) — Comparison data
- [Product Identity](../design/product-identity.md) — Feature details and pricing
- [ADR-0004: Auth & Security](../architecture/0004-auth-security-architecture.md) — Security architecture for press FAQ
- [Privacy Policy](../legal/privacy-policy.md) — Data handling policies
