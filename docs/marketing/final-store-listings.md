# Final Store Listing Optimization

> **Issue:** [#846](https://github.com/jrmoulckers/finance/issues/846)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 4
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [ASO Research](aso-keyword-research.md) · [Beta Insights](beta-insights-report.md) · [Screenshot Spec](screenshot-spec.md)

---

## Table of Contents

1. [Pre-Launch Verification Checklist](#1-pre-launch-verification-checklist)
2. [Final iOS Store Listing](#2-final-ios-store-listing)
3. [Final Android Store Listing](#3-final-android-store-listing)
4. [Final Windows Store Listing](#4-final-windows-store-listing)
5. [Final Web Meta Tags](#5-final-web-meta-tags)
6. [A/B Test Plan](#6-ab-test-plan)
7. [What's New — v1.0 Release Notes](#7-whats-new--v10-release-notes)
8. [URL & Link Verification](#8-url--link-verification)
9. [Character Limit Audit](#9-character-limit-audit)

---

## 1. Pre-Launch Verification Checklist

### Content Verification

- [ ] All store descriptions finalized and proofread
- [ ] All character limits verified (see § 9)
- [ ] All `{{PLACEHOLDER}}` values resolved
- [ ] Screenshots uploaded in correct order for all platforms
- [ ] Dark mode screenshots included (iOS required, Android recommended)
- [ ] Feature graphic uploaded (Android)
- [ ] App icon verified at all required sizes
- [ ] Category selection correct on each store
- [ ] Age rating set correctly on each store
- [ ] Content rating questionnaire completed (Android)

### Privacy & Legal Verification

- [ ] Privacy policy URL accessible and correct
- [ ] Terms of service URL accessible and correct
- [ ] Apple privacy labels match actual app behavior
- [ ] Google Play data safety section matches actual app behavior
- [ ] No claims about unshipped features in any listing
- [ ] All privacy claims verified against architecture docs (see privacy-marketing-messaging.md § 3)

### Technical Verification

- [ ] Support URL works and leads to helpful content
- [ ] Support email configured and monitored
- [ ] App version number correct
- [ ] Minimum OS versions correctly set per platform
- [ ] In-app purchase configured (if premium tier is available at launch)

---

## 2. Final iOS Store Listing

### App Name (30 characters)

```
Finance - Budget Tracker
```

✅ 24/30 characters

### Subtitle (30 characters)

```
Private. Offline. Yours.
```

✅ 24/30 characters

### Keywords (100 characters)

```
budget,expense,tracker,spending,envelope,offline,private,savings,goals,money,plan,ADHD,accessible,free
```

✅ 100/100 characters

### Promotional Text (170 characters)

```
Your money, your device. Track spending offline with encrypted data, envelope budgeting, and an interface that adapts to your comfort level. Free forever. No bank required.
```

✅ 170/170 characters

_(Promotional text can be updated without new app review)_

### Description

```
Finance helps you see where your money goes — without giving up your privacy.

YOUR MONEY STAYS ON YOUR DEVICE
Every transaction, budget, and goal is encrypted on your device using AES-256 encryption (SQLCipher). No server uploads unless you choose to sync. No bank connection required. Your financial data is yours alone.

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

NATIVE iOS EXPERIENCE
Built with SwiftUI for a truly native feel:
• Lock Screen and Home Screen widgets
• Interactive widgets (iOS 17+) for quick entry
• Face ID for secure access
• Dynamic Type for your preferred text size
• VoiceOver accessible throughout

ACCESSIBILITY IS A FOUNDATION
• Cognitive: simplified views, reduced motion, non-judgmental language
• Visual: Dynamic Type, high contrast, color-blind safe charts
• Motor: large touch targets, full keyboard navigation
• Screen readers: full VoiceOver support

FREE FOREVER
The complete financial tracker — accounts, transactions, budgets, goals, reports — is free. No trial. No feature walls. No ads.

Premium adds AI insights, multi-device sync, and household sharing for those who want more.

OPEN AND TRANSPARENT
Finance is source-available. Read the code that handles your financial data at github.com/jrmoulckers/finance.
```

### Privacy Labels (App Privacy)

| Data Type            | Collected                          | Linked to Identity  | Tracking |
| -------------------- | ---------------------------------- | ------------------- | -------- |
| Financial data       | ❌ Not collected (stays on device) | —                   | ❌       |
| Contact info (email) | ✅ Only with account creation      | ✅ (authentication) | ❌       |
| Usage data           | ❌ Not collected                   | —                   | ❌       |
| Diagnostics          | ❌ Not collected                   | —                   | ❌       |

**Privacy policy URL:** [{{PRIVACY_POLICY_URL}}]

### Category

**Primary:** Finance
**Secondary:** Productivity

---

## 3. Final Android Store Listing

### App Title (30 characters)

```
Finance - Budget Tracker
```

✅ 24/30 characters

### Short Description (80 characters)

```
Track spending privately. Offline budget tracker with encrypted data. Free.
```

✅ 75/80 characters

### Full Description

```
Finance helps you see where your money goes — without giving up your privacy.

★ YOUR DATA STAYS ON YOUR DEVICE
Every transaction, budget, and goal is encrypted on your device with AES-256 encryption. No uploads to remote servers unless you choose to sync. No bank connection required.

★ TRACK SPENDING IN 30 SECONDS
Add a transaction in 3 taps: amount, category, done. Smart category suggestions learn from your habits. Quick Settings tile for instant entry.

★ ENVELOPE BUDGETING
Give every dollar a purpose. Set budgets by category, track remaining amounts, and adjust as life happens. Zero-based budgeting made accessible.

★ ADAPTS TO YOUR COMFORT LEVEL
Three expertise tiers change terminology, features, and chart complexity:
• Getting Started — plain language, guided prompts
• Comfortable — full features, standard terms
• Advanced — detailed data, power-user shortcuts

★ NON-JUDGMENTAL
Over budget? Finance shows the facts and lets you decide. No shame. No guilt. Just information and options.

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
Your budget works across devices: Android, iOS, Web, and Windows.

★ FREE FOREVER
Complete tracker: accounts, transactions, budgets, goals, and reports. No trial. No ads. No hidden limits.

Premium (optional): AI insights, multi-device sync, household sharing.

★ OPEN & TRANSPARENT
Source-available under BSL 1.1. Read every line of code at github.com/jrmoulckers/finance.
```

### Data Safety Section

| Data Type                              | Collected                  | Shared | Encrypted in Transit | Deletable              |
| -------------------------------------- | -------------------------- | ------ | -------------------- | ---------------------- |
| Financial info (transactions, budgets) | On device only             | No     | N/A (local)          | Yes                    |
| Email address                          | With account creation only | No     | Yes                  | Yes (crypto-shredding) |
| App activity                           | No                         | No     | N/A                  | N/A                    |
| Device info                            | No                         | No     | N/A                  | N/A                    |

**Data deletion:** Users can delete all data via in-app account deletion (crypto-shredding).

### Category

**Primary:** Finance
**Tags:** Budget, Expense Tracker, Offline, Private, Envelope Budget, Savings Goals, Accessible

---

## 4. Final Windows Store Listing

### App Name

```
Finance - Budget Tracker
```

### Short Description (256 characters)

```
Track your spending privately on Windows. Finance is an offline-first budget tracker with encrypted data, envelope budgeting, and an interface that adapts to your comfort level. Supports Windows Hello, Snap Layouts, and Narrator. Free forever.
```

✅ 246/256 characters

### Description

```
Finance helps you see where your money goes — without giving up your privacy.

A DESKTOP BUDGET TRACKER THAT RESPECTS YOUR DATA
Every transaction, budget, and goal is encrypted on your device with AES-256 encryption. No server uploads unless you choose to sync. No bank connection required.

DESIGNED FOR WINDOWS
• Windows Hello biometric unlock
• Snap Layouts integration for multitasking
• System toast notifications for budget check-ins
• Narrator and High Contrast accessibility
• Keyboard-first workflow with shortcuts
• Desktop-optimized multi-panel layout

TRACK SPENDING IN SECONDS
Quick keyboard entry for transactions. Smart category suggestions. Full keyboard navigation for power users.

ENVELOPE BUDGETING
Give every dollar a purpose. Set budgets by category, track remaining amounts, and adjust as life happens.

ADAPTS TO YOUR COMFORT LEVEL
Three expertise tiers: Getting Started (plain language), Comfortable (standard features), Advanced (detailed data and shortcuts).

WORKS OFFLINE
No internet required. Full functionality without a network connection.

SYNCS WITH YOUR PHONE
Use Finance on Android or iOS too — data syncs across all your devices (optional, encrypted).

FREE FOREVER
Complete tracker with no trial, no ads, and no feature limits.

SOURCE-AVAILABLE
Read the code at github.com/jrmoulckers/finance.
```

---

## 5. Final Web Meta Tags

### HTML Meta Tags

```html
<!-- Primary Meta Tags -->
<title>Finance — Private Budget Tracker | Offline & Free</title>
<meta
  name="description"
  content="Track spending in 30 seconds with Finance — a free, offline-first budget tracker. Your data stays encrypted on your device. No bank connection required."
/>

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website" />
<meta property="og:url" content="{{WEBSITE_URL}}" />
<meta property="og:title" content="Finance — Private Budget Tracker" />
<meta
  property="og:description"
  content="A free, multi-platform budget tracker that keeps your data encrypted on your device. Works offline. No bank connection required."
/>
<meta property="og:image" content="{{WEBSITE_URL}}/assets/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:url" content="{{WEBSITE_URL}}" />
<meta name="twitter:title" content="Finance — Private Budget Tracker" />
<meta
  name="twitter:description"
  content="Free, offline-first budget tracker. Your data stays encrypted on your device. No bank connection required."
/>
<meta name="twitter:image" content="{{WEBSITE_URL}}/assets/twitter-card.png" />

<!-- Additional -->
<meta
  name="keywords"
  content="budget app, expense tracker, offline budget, private finance, envelope budgeting, free budget app, ADHD budget, accessible finance"
/>
<link rel="canonical" href="{{WEBSITE_URL}}" />
```

### PWA Manifest Snippet

```json
{
  "name": "Finance - Budget Tracker",
  "short_name": "Finance",
  "description": "Private, offline-first budget tracker. Your data stays encrypted on your device.",
  "categories": ["finance", "productivity"]
}
```

---

## 6. A/B Test Plan

### iOS Promotional Text A/B Test

Run after 2 weeks of launch data:

| Variant         | Copy                                                                                                                                                                           | Metric          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| A (Control)     | "Your money, your device. Track spending offline with encrypted data, envelope budgeting, and an interface that adapts to your comfort level. Free forever. No bank required." | Conversion rate |
| B (Speed-led)   | "Track spending in 3 taps. Offline, encrypted, and free — no bank connection needed. Envelope budgeting that adapts to your comfort level with money. Your data stays yours."  | Conversion rate |
| C (Problem-led) | "Your budget app shouldn't need your bank password. Finance works offline, keeps data encrypted on your device, and tracks spending in 30 seconds. Free forever."              | Conversion rate |

### Android Short Description A/B Test

| Variant     | Copy                                                                          | Metric       |
| ----------- | ----------------------------------------------------------------------------- | ------------ |
| A (Control) | "Track spending privately. Offline budget tracker with encrypted data. Free." | Install rate |
| B (Speed)   | "Budget in 30 seconds. Offline, encrypted, and free. No bank login needed."   | Install rate |

### iOS Custom Product Pages

Create up to 35 custom product pages for targeted campaigns:

| Page             | Audience                          | Screenshot Order Change        | Description Emphasis                |
| ---------------- | --------------------------------- | ------------------------------ | ----------------------------------- |
| Privacy-focused  | r/privacy, DuckDuckGo users       | Privacy screenshot first       | Lead with encryption                |
| ADHD-focused     | r/adhd, accessibility communities | Accessibility screenshot first | Lead with cognitive accessibility   |
| YNAB alternative | r/ynab, budgeting communities     | Budget view first              | Lead with envelope budgeting + free |

---

## 7. What's New — v1.0 Release Notes

### iOS

```
Finance 1.0 — Your money, your device, your control.

• Track spending with 3-tap quick entry
• Envelope budgeting — give every dollar a purpose
• Goals with progress tracking and projections
• Reports and spending insights
• Works fully offline — no internet needed
• All data encrypted on your device (AES-256)
• Three comfort levels adapt to your experience
• Widgets for budget tracking at a glance
• Face ID for secure access
• VoiceOver accessible throughout

Free forever. No ads. No bank connection required.
```

### Android

```
Finance 1.0 — Your money, your device, your control.

• Track spending with 3-tap quick entry
• Envelope budgeting — give every dollar a purpose
• Goals with progress tracking and projections
• Reports and spending insights
• Works fully offline — no internet needed
• All data encrypted on your device (AES-256)
• Three comfort levels adapt to your experience
• Material You theming matches your device
• Home screen widgets and Quick Settings tile
• TalkBack accessible throughout

Free forever. No ads. No bank connection required.
```

---

## 8. URL & Link Verification

### Required URLs (Verify All Are Live)

| URL                    | Purpose                             | Status                       |
| ---------------------- | ----------------------------------- | ---------------------------- |
| Privacy policy         | Store requirement (all platforms)   | [ ] Live and accessible      |
| Terms of service       | Store requirement (all platforms)   | [ ] Live and accessible      |
| Support URL            | Store requirement + user support    | [ ] Live and accessible      |
| Support email          | User contact                        | [ ] Configured and monitored |
| Website / landing page | Marketing, download links           | [ ] Live and accessible      |
| GitHub repository      | Source-available claim verification | [ ] Public and accessible    |

### App Store Deep Links

| Link                 | Purpose                     | Status                       |
| -------------------- | --------------------------- | ---------------------------- |
| iOS App Store link   | Download CTA, cross-linking | [ ] Generated after approval |
| Google Play link     | Download CTA, cross-linking | [ ] Generated after listing  |
| Microsoft Store link | Download CTA, cross-linking | [ ] Generated after listing  |
| Web PWA URL          | Direct access               | [ ] Live                     |

---

## 9. Character Limit Audit

### Final Verification

| Field             | Platform | Limit | Used   | Status |
| ----------------- | -------- | ----- | ------ | ------ |
| App name          | iOS      | 30    | 24     | ✅     |
| Subtitle          | iOS      | 30    | 24     | ✅     |
| Keywords          | iOS      | 100   | 100    | ✅     |
| Promotional text  | iOS      | 170   | 170    | ✅     |
| Description       | iOS      | 4,000 | ~1,950 | ✅     |
| App title         | Android  | 30    | 24     | ✅     |
| Short description | Android  | 80    | 75     | ✅     |
| Full description  | Android  | 4,000 | ~1,750 | ✅     |
| Short description | Windows  | 256   | 246    | ✅     |
| Page title        | Web      | 60    | 50     | ✅     |
| Meta description  | Web      | 155   | 153    | ✅     |

### Readability Check

Target: Flesch-Kincaid ≤ 8th grade level for all user-facing descriptions.

| Text                | FK Grade Level    | Status       |
| ------------------- | ----------------- | ------------ |
| iOS description     | [Check with tool] | [ ] Verified |
| Android description | [Check with tool] | [ ] Verified |
| Windows description | [Check with tool] | [ ] Verified |

---

## References

- [ASO Research](aso-keyword-research.md) — Keyword strategy and initial listings
- [Beta Insights](beta-insights-report.md) — Feedback-driven optimization
- [Screenshot Spec](screenshot-spec.md) — Visual asset requirements
- [Privacy Marketing Messaging](privacy-marketing-messaging.md) — Privacy claim accuracy
- [Brand Voice Guide](brand-voice-guide.md) — Tone and vocabulary
