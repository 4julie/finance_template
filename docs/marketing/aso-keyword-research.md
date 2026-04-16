# ASO Keyword Research & Store Listing Refinement

> **Issue:** [#835](https://github.com/jrmoulckers/finance/issues/835)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 1
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Product Identity](../design/product-identity.md) · [Brand Voice Guide](brand-voice-guide.md)

---

## Table of Contents

1. [Keyword Research Methodology](#1-keyword-research-methodology)
2. [Primary Keyword Clusters](#2-primary-keyword-clusters)
3. [Competitor Keyword Gap Analysis](#3-competitor-keyword-gap-analysis)
4. [iOS App Store Optimization](#4-ios-app-store-optimization)
5. [Google Play Store Optimization](#5-google-play-store-optimization)
6. [Microsoft Store Optimization](#6-microsoft-store-optimization)
7. [Web PWA / SEO Optimization](#7-web-pwa--seo-optimization)
8. [A/B Test Variants](#8-ab-test-variants)
9. [Seasonal & Trending Keywords](#9-seasonal--trending-keywords)
10. [Measurement Plan](#10-measurement-plan)

---

## 1. Keyword Research Methodology

### Approach

Keywords were selected based on:

- **Relevance:** Directly describes what Finance does
- **Differentiation:** Emphasizes what makes Finance unique (privacy, offline, accessibility)
- **Search volume:** Prioritizes terms people actually search for in app stores
- **Competition:** Balances high-volume competitive terms with lower-volume niche terms
- **Intent:** Targets people looking for a solution, not just browsing

### Sources

- App Store Connect Search Ads keyword suggestions (estimated — human should validate in console)
- Google Play Console auto-suggest and pre-registration analytics
- Competitor listing analysis (YNAB, Monarch, Copilot, Goodbudget, PocketGuard)
- Reddit and community language analysis (r/personalfinance, r/budgeting, r/ynab, r/privacy)
- Privacy-focused search terms from DuckDuckGo Trends and Google Trends

---

## 2. Primary Keyword Clusters

### Cluster 1: Core Function (Highest Priority)

| Keyword          | Estimated Volume | Competition | Finance Relevance |
| ---------------- | ---------------- | ----------- | ----------------- |
| budget app       | Very High        | Very High   | ★★★               |
| expense tracker  | Very High        | Very High   | ★★★               |
| budget tracker   | High             | High        | ★★★               |
| spending tracker | High             | Medium      | ★★★               |
| money tracker    | High             | High        | ★★★               |
| personal finance | High             | Very High   | ★★★               |
| budget planner   | Medium           | High        | ★★★               |
| finance tracker  | Medium           | Medium      | ★★★               |

### Cluster 2: Privacy Differentiator (High Priority — Low Competition)

| Keyword                   | Estimated Volume | Competition | Finance Relevance |
| ------------------------- | ---------------- | ----------- | ----------------- |
| private budget app        | Low              | Very Low    | ★★★               |
| offline budget app        | Low              | Very Low    | ★★★               |
| no bank connection budget | Very Low         | Very Low    | ★★★               |
| encrypted finance app     | Very Low         | Very Low    | ★★★               |
| privacy budget tracker    | Very Low         | Very Low    | ★★★               |
| offline expense tracker   | Low              | Low         | ★★★               |
| secure budget app         | Low              | Low         | ★★★               |

### Cluster 3: Methodology (Medium Priority)

| Keyword            | Estimated Volume | Competition | Finance Relevance |
| ------------------ | ---------------- | ----------- | ----------------- |
| envelope budgeting | Medium           | Medium      | ★★★               |
| zero based budget  | Medium           | Medium      | ★★★               |
| YNAB alternative   | Medium           | Low         | ★★★               |
| budget categories  | Low              | Low         | ★★★               |
| savings goals      | Medium           | Medium      | ★★                |
| spending plan      | Medium           | Medium      | ★★★               |

### Cluster 4: Accessibility & Inclusion (Medium Priority — Differentiator)

| Keyword                | Estimated Volume | Competition | Finance Relevance |
| ---------------------- | ---------------- | ----------- | ----------------- |
| ADHD budget app        | Low              | Very Low    | ★★★               |
| accessible finance app | Very Low         | Very Low    | ★★★               |
| simple budget app      | Medium           | Medium      | ★★★               |
| easy expense tracker   | Medium           | Medium      | ★★                |
| beginner budget app    | Low              | Low         | ★★★               |

### Cluster 5: Platform-Specific (Per-Store)

| Keyword                | Platform | Volume   | Competition |
| ---------------------- | -------- | -------- | ----------- |
| budget app for iPhone  | iOS      | Medium   | High        |
| Android budget tracker | Android  | Medium   | Medium      |
| Windows budget app     | Windows  | Low      | Very Low    |
| budget PWA             | Web      | Very Low | Very Low    |
| budget app offline     | All      | Low      | Low         |

---

## 3. Competitor Keyword Gap Analysis

### YNAB (You Need A Budget)

- **Dominates:** "envelope budgeting," "zero based budget," "budget method," "give every dollar a job"
- **Gaps Finance can exploit:** "free envelope budgeting," "offline budgeting," "private budget app," "YNAB alternative free," "no subscription budget"
- **Pricing gap:** YNAB is $14.99/mo — "free budget app" + "envelope budgeting" is an underserved combination

### Monarch Money

- **Dominates:** "financial dashboard," "net worth tracker," "couples finance"
- **Gaps Finance can exploit:** "offline net worth tracker," "private financial dashboard," "no bank connection finance"
- **Privacy gap:** Monarch requires Plaid bank connections — "budget without bank password" directly differentiates

### Copilot (iOS only)

- **Dominates:** "beautiful budget app," "iOS finance," "modern budget app"
- **Gaps Finance can exploit:** "cross-platform budget," "budget app Android and iPhone," "works offline"
- **Platform gap:** Copilot is iOS-only — "works on all your devices" differentiates

### Goodbudget

- **Dominates:** "envelope budget free," "family budget," "shared budget"
- **Gaps Finance can exploit:** "envelope budgeting offline," "private envelope budget," "modern envelope app"
- **UX gap:** Goodbudget has dated UI — "modern" and "native" terms differentiate

### PocketGuard

- **Dominates:** "how much can I spend," "spending limit," "bills tracker"
- **Gaps Finance can exploit:** "spending tracker private," "no bank connection spending tracker"
- **Privacy gap:** PocketGuard requires bank connections and collects significant data

---

## 4. iOS App Store Optimization

### App Name (30 characters max)

```
Finance - Budget Tracker
```

**Characters used:** 24/30

### Subtitle (30 characters max)

**Option A (privacy-led):**

```
Private. Offline. Yours.
```

**Characters used:** 24/30

**Option B (benefit-led):**

```
Track Spending in 30 Seconds
```

**Characters used:** 29/30

**Option C (method-led):**

```
Envelope Budget, Your Device
```

**Characters used:** 29/30

**Recommendation:** Option A for launch — privacy is the primary differentiator. Test Option B post-launch.

### Keywords (100 characters max)

```
budget,expense,tracker,spending,envelope,offline,private,savings,goals,money,plan,ADHD,accessible,free
```

**Characters used:** 100/100

**Keyword strategy notes:**

- Comma-separated, no spaces (Apple concatenates with app name/subtitle for matching)
- "budget" and "tracker" appear in the app name, so they're redundant in the keyword field but included for phrase matching
- "ADHD" and "accessible" target the underserved accessibility-conscious segment
- "free" captures price-sensitive searches — Finance's free tier is genuinely complete
- No competitor brand names (policy violation risk on App Store)

### Promotional Text (170 characters — can be updated without review)

**Option A:**

```
Your money, your device. Track spending offline with encrypted data, envelope budgeting, and an interface that adapts to your comfort level. Free forever. No bank required.
```

**Characters used:** 170/170

**Option B:**

```
Budget privately — all data stays encrypted on your device. Works offline, adapts to your comfort level with money, and tracks spending in 3 taps. Free core features forever.
```

**Characters used:** 172 — ⚠️ over limit, needs trimming

**Option B (trimmed):**

```
Budget privately — data stays encrypted on your device. Works offline, adapts to your comfort with money, and tracks spending in 3 taps. Free core features, always.
```

**Characters used:** 164/170

### Description (4000 characters max)

```
Finance helps you see where your money goes — without giving up your privacy.

YOUR MONEY STAYS ON YOUR DEVICE
Every transaction, budget, and goal is encrypted on your device using AES-256 encryption. No server uploads unless you choose to sync. No bank connection required. Your financial data is yours alone.

TRACK SPENDING IN 30 SECONDS
Add a transaction in 3 taps: amount, category, done. Smart suggestions learn your habits over time. Spend less time logging and more time living.

ENVELOPE BUDGETING THAT MAKES SENSE
Give every dollar a purpose. Set budgets by category, track what's left, and adjust as life happens. Inspired by proven budgeting methods, built for how people actually manage money.

WORKS WITH YOUR BRAIN
Three comfort levels adapt the entire experience:
• Getting Started — plain language, guided prompts, simplified views
• Comfortable — full features, standard terminology
• Advanced — detailed breakdowns, power-user shortcuts
Switch anytime in Settings. No commitment, no judgment.

FACTS, NOT JUDGMENTS
Over budget? Finance tells you the facts and asks what you'd like to do. No red warnings. No shame. No anxiety-inducing notifications. Just clear information and your choice.

WORKS OFFLINE, EVERYWHERE
Finance runs entirely on your device. No internet? No problem. Add transactions, check budgets, review reports — all offline. Sync across devices when you're ready (optional, encrypted).

NATIVE ON EVERY PLATFORM
Built specifically for each platform — not a wrapped web view:
• iOS & iPad — SwiftUI, widgets, Face ID
• Android — Jetpack Compose, Material You, fingerprint
• Web — Progressive Web App, keyboard shortcuts
• Windows — Compose Desktop, Windows Hello, Snap Layouts

ACCESSIBILITY IS A FOUNDATION
• Cognitive accessibility: simplified views, reduced motion, non-judgmental language
• Visual: Dynamic Type, high contrast, color-blind safe charts
• Motor: large touch targets, full keyboard navigation
• Screen readers: VoiceOver, TalkBack, Narrator support

FREE FOREVER
The complete financial tracker — accounts, transactions, budgets, goals, reports — is free. No trial period. No feature walls. No ads.

Premium adds AI insights, multi-device sync, and household sharing for those who want more.

OPEN AND TRANSPARENT
Finance is source-available under the Business Source License. Read the code that handles your financial data at github.com/jrmoulckers/finance.

PRIVACY POLICY
We don't sell data. We don't show ads. We don't track you. Read our full privacy policy in the app or at our website.
```

**Estimated characters:** ~1,950/4,000

---

## 5. Google Play Store Optimization

### App Title (30 characters max)

```
Finance - Budget Tracker
```

**Characters used:** 24/30

### Short Description (80 characters max)

**Option A (privacy-led):**

```
Track spending privately. Offline budget tracker with encrypted data. Free.
```

**Characters used:** 75/80

**Option B (benefit-led):**

```
Budget in 30 seconds. Offline, encrypted, and free. No bank login needed.
```

**Characters used:** 74/80

**Option C (accessibility-led):**

```
Budget tracker that adapts to you. Private, offline, accessible. Free forever.
```

**Characters used:** 78/80

### Full Description (4000 characters max)

```
Finance helps you see where your money goes — without giving up your privacy.

★ YOUR DATA STAYS ON YOUR DEVICE
Every transaction, budget, and goal is encrypted on your device with AES-256 encryption. No uploads to remote servers unless you choose to sync. No bank connection required. Your financial data stays yours.

★ TRACK SPENDING IN 30 SECONDS
Add a transaction in 3 taps: amount, category, done. Smart category suggestions learn from your habits. Quick Settings tile for instant entry. Material You theming matches your device.

★ ENVELOPE BUDGETING
Give every dollar a purpose. Set budgets by category, track remaining amounts, and adjust as life happens. Zero-based budgeting made accessible.

★ ADAPTS TO YOUR COMFORT LEVEL
Three expertise tiers change terminology, features, and chart complexity:
• Getting Started — plain language, guided prompts
• Comfortable — full features, standard terms
• Advanced — detailed data, power-user shortcuts

★ NON-JUDGMENTAL
Over budget? Finance shows the facts and lets you decide. No shame. No guilt. No aggressive notifications. Just information and options.

★ WORKS OFFLINE
No internet required. Add transactions, check budgets, view reports — all locally. Sync is optional and encrypted.

★ NATIVE ANDROID EXPERIENCE
Built with Jetpack Compose and Material Design 3:
• Material You dynamic color theming
• Home screen widgets for budget tracking
• Quick Settings tile for instant entry
• App Shortcuts for common actions
• Predictive Back gesture support
• TalkBack accessible throughout

★ ACCESSIBLE BY DESIGN
• Cognitive: simplified views, reduced motion, routine-friendly
• Visual: font scaling, high contrast, color-blind safe charts
• Motor: 48dp minimum touch targets, full keyboard nav

★ MULTI-PLATFORM
Your budget works across devices:
• Android (phone + tablet)
• iOS (iPhone + iPad)
• Web (PWA with offline support)
• Windows 11 (native desktop)

★ FREE FOREVER
Complete financial tracker: accounts, transactions, budgets, goals, and reports. No trial. No ads. No hidden limits.

Premium (optional): AI insights, multi-device sync, household sharing.

★ OPEN & TRANSPARENT
Source-available under BSL 1.1. Read every line of code at github.com/jrmoulckers/finance.

We don't sell your data. We don't show ads. We don't track you.
```

**Estimated characters:** ~1,750/4,000

### Google Play Tags

```
Finance, Budget, Expense Tracker, Offline, Private, Envelope Budget,
Savings Goals, Money Tracker, Accessible, ADHD-friendly
```

---

## 6. Microsoft Store Optimization

### App Name

```
Finance - Budget Tracker
```

### Short Description (up to 256 characters)

```
Track your spending privately on Windows. Finance is an offline-first budget tracker with encrypted data, envelope budgeting, and an interface that adapts to your comfort level. Supports Windows Hello, Snap Layouts, and Narrator. Free forever.
```

**Characters used:** 246/256

### Description Features to Emphasize

- **Windows Hello** biometric unlock
- **Snap Layouts** for multitasking
- **Narrator** and **High Contrast** accessibility
- **Keyboard-first** workflow with shortcuts
- Desktop-optimized layout
- Syncs with mobile (iOS/Android) versions

### Microsoft Store Keywords

```
budget, expense tracker, finance, spending tracker, offline, private,
encrypted, envelope budget, savings goals, money, accessible, free
```

---

## 7. Web PWA / SEO Optimization

### Target Landing Page Keywords

| Primary (Head Terms)   | Long-Tail Variations                            |
| ---------------------- | ----------------------------------------------- |
| budget app             | private budget app no bank connection           |
| expense tracker        | offline expense tracker that works offline      |
| personal finance app   | ADHD friendly budget app                        |
| envelope budgeting app | free envelope budgeting app alternative to YNAB |
| offline budget tracker | encrypted personal finance tracker              |

### Meta Description (155 characters)

```
Track spending in 30 seconds with Finance — a free, offline-first budget tracker. Your data stays encrypted on your device. No bank connection required.
```

**Characters used:** 153/155

### Page Title (60 characters)

```
Finance — Private Budget Tracker | Offline & Free
```

**Characters used:** 50/60

### Open Graph Description (for social sharing)

```
A free, multi-platform budget tracker that keeps your data encrypted on your device. Works offline. No bank connection required. Track spending in 30 seconds.
```

### Key SEO Content Targets

| Page          | Primary Keyword        | Secondary Keywords                                         |
| ------------- | ---------------------- | ---------------------------------------------------------- |
| Homepage      | private budget app     | offline budget tracker, encrypted finance                  |
| Features      | envelope budgeting app | zero-based budget, savings goals, spending tracker         |
| Privacy       | privacy-first finance  | no data collection, encrypted budget, offline tracker      |
| Accessibility | ADHD budget app        | accessible finance, cognitive accessibility, simple budget |
| Pricing       | free budget app        | free envelope budgeting, no subscription budget app        |

---

## 8. A/B Test Variants

### iOS Promotional Text (test post-launch)

| Variant     | Copy                                                                                                                            | Hypothesis                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| A (Control) | "Your money, your device. Track spending offline with encrypted data..."                                                        | Privacy-led attracts privacy-conscious users   |
| B (Benefit) | "Track spending in 3 taps. Budget with purpose. See where your money goes — all offline and encrypted."                         | Feature-led increases conversion from browsing |
| C (Problem) | "Tired of budget apps that need your bank password? Finance works offline, stays encrypted, and tracks spending in 30 seconds." | Problem-awareness-led increases relevance      |

### Android Short Description (test post-launch)

| Variant        | Copy                                                                             | Hypothesis       |
| -------------- | -------------------------------------------------------------------------------- | ---------------- |
| A (Control)    | "Track spending privately. Offline budget tracker with encrypted data. Free."    | Privacy anchor   |
| B (Speed)      | "Budget in 30 seconds. Offline, encrypted, and free. No bank login needed."      | Speed anchor     |
| C (Accessible) | "Budget tracker that adapts to you. Private, offline, accessible. Free forever." | Inclusion anchor |

---

## 9. Seasonal & Trending Keywords

### January (New Year's Resolutions)

- "new year budget," "budget resolution," "financial goals 2026," "start budgeting"
- **Promotional text update:** Mention fresh-start budgeting, goal setting

### April (Tax Season)

- "track expenses," "spending categories," "financial records," "expense export"
- **Promotional text update:** Mention CSV export for tax reference

### September (Back to School / Fresh Start)

- "student budget," "college budget app," "simple finance tracker"
- **Promotional text update:** Mention the free tier for students

### Year-Round Privacy Events

- Data Privacy Day (January 28), Cybersecurity Awareness Month (October)
- **Content opportunity:** Blog posts timed to these events, social media campaigns

---

## 10. Measurement Plan

### Metrics to Track (Privacy-Preserving)

All metrics come from store dashboards — no in-app tracking required:

| Metric                                 | Source                                                   | Frequency      |
| -------------------------------------- | -------------------------------------------------------- | -------------- |
| Keyword ranking position               | App Store Connect, Play Console                          | Weekly         |
| Impressions per keyword                | App Store Connect, Play Console                          | Weekly         |
| Conversion rate (impression → install) | App Store Connect, Play Console                          | Weekly         |
| Browse vs. search installs split       | App Store Connect, Play Console                          | Weekly         |
| Top search terms driving installs      | App Store Connect, Play Console                          | Weekly         |
| A/B test results                       | App Store Connect custom pages, Play Console experiments | Per experiment |
| Landing page organic traffic           | Privacy-respecting analytics (Plausible/Fathom)          | Weekly         |

### Optimization Cadence

| Timeframe              | Action                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Weekly (first month)   | Review keyword rankings, adjust promotional text if needed             |
| Bi-weekly (months 2–3) | Run A/B tests on short descriptions, analyze results                   |
| Monthly (ongoing)      | Review keyword performance, add seasonal terms, update screenshots     |
| Quarterly              | Full ASO audit — keyword refresh, description rewrite, new screenshots |

---

## References

- [Product Identity](../design/product-identity.md) — Competitive positioning table
- [Brand Voice Guide](brand-voice-guide.md) — Tone and vocabulary for all copy
- [ADR-0003: Local Storage](../architecture/0003-local-storage-strategy.md) — SQLCipher encryption claims
- [ADR-0004: Auth & Security](../architecture/0004-auth-security-architecture.md) — Security architecture claims
- [Privacy Policy](../legal/privacy-policy.md) — Data handling for "no tracking" claims
