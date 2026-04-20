# Beta Recruitment Campaign

> **Issue:** [#838](https://github.com/jrmoulckers/finance/issues/838)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 2
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Brand Voice Guide](brand-voice-guide.md) · [Competitive Positioning](competitive-positioning.md) · [Personas](../design/personas.md)

---

## Table of Contents

1. [Beta Recruitment Goals](#1-beta-recruitment-goals)
2. [Channel Strategy](#2-channel-strategy)
3. [Recruitment Copy by Channel](#3-recruitment-copy-by-channel)
4. [Landing Page Copy](#4-landing-page-copy)
5. [Screening Questionnaire](#5-screening-questionnaire)
6. [Beta Tester Welcome Sequence](#6-beta-tester-welcome-sequence)
7. [Timeline](#7-timeline)
8. [Success Metrics](#8-success-metrics)

---

## 1. Beta Recruitment Goals

### Targets

| Metric                         | Target                           | Rationale                                                                |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------ |
| **Total testers**              | 40–60                            | Small enough for meaningful feedback, large enough for platform coverage |
| **iOS testers**                | 10–15                            | Primary consumer platform                                                |
| **Android testers**            | 10–15                            | Equal priority with iOS                                                  |
| **Web testers**                | 8–12                             | PWA-specific testing needs                                               |
| **Windows testers**            | 5–8                              | Smallest initial audience, still need coverage                           |
| **Accessibility testers**      | ≥5 (across platforms)            | Critical — ADHD, screen reader users, motor accessibility                |
| **Expertise tier coverage**    | ≥3 per tier                      | Getting Started, Comfortable, Advanced all represented                   |
| **Financial experience range** | Budgeting novices to power users | Validates expertise-tiered UI                                            |

### Recruitment Principles

- **Honest about what beta means** — It's early software. Bugs will exist. Feedback shapes the product.
- **No artificial scarcity** — We don't say "limited spots" unless we genuinely cap enrollment.
- **Diverse representation** — Platform diversity, ability diversity, financial experience diversity.
- **Clear about data** — Beta data stays on device. We explain exactly what telemetry exists (none, unless opted in).
- **Respect subreddit/community rules** — Every post complies with the hosting community's self-promotion policies.

---

## 2. Channel Strategy

| Channel                           | Audience Fit                                        | Priority  | Expected Yield |
| --------------------------------- | --------------------------------------------------- | --------- | -------------- |
| **Reddit — r/personalfinance**    | General budgeting audience, Alex/Jordan personas    | 🔴 High   | 8–12 testers   |
| **Reddit — r/ynab**               | YNAB-experienced budgeters looking for alternatives | 🔴 High   | 5–8 testers    |
| **Reddit — r/privacy**            | Privacy-conscious users                             | 🔴 High   | 5–8 testers    |
| **Reddit — r/adhd**               | Casey persona, cognitive accessibility testers      | 🔴 High   | 3–5 testers    |
| **Reddit — r/budgeting**          | Active budgeters                                    | 🟡 Medium | 3–5 testers    |
| **Hacker News**                   | Technical audience, privacy + open source           | 🟡 Medium | 5–10 testers   |
| **Twitter/X**                     | Mixed audience, existing followers                  | 🟡 Medium | 3–5 testers    |
| **Product Hunt Upcoming**         | Early adopter tech audience                         | 🟡 Medium | 2–5 testers    |
| **Personal/professional network** | Trusted early feedback                              | 🔴 High   | 5–8 testers    |
| **GitHub Discussions / Issues**   | Technical contributors, open source community       | 🟡 Medium | 2–5 testers    |

---

## 3. Recruitment Copy by Channel

### Reddit — r/personalfinance

**Title:** "Looking for beta testers for a free, offline-first budget tracker (iOS, Android, Web, Windows)"

**Post:**

> Hi r/personalfinance,
>
> I've been building Finance, a personal budget tracker that takes a different approach to financial apps. The core idea: your financial data stays encrypted on your device, the app works fully offline, and it doesn't require a bank connection.
>
> **What it is:**
>
> - Envelope budgeting (give every dollar a purpose)
> - Works on iOS, Android, Web, and Windows — all natively built
> - All data encrypted on your device (AES-256 via SQLCipher)
> - No bank connection required (manual entry)
> - Adapts to your comfort level with money (3 expertise tiers)
> - Free — the core tracker has no trial, no artificial limits
>
> **What I'm looking for:**
> I'm recruiting 40–60 beta testers to try the app and share honest feedback before public launch. Looking for people across all 4 platforms, from budgeting beginners to power users. I'm especially interested in feedback from people who've felt overwhelmed by existing finance apps.
>
> **What you'd do:**
>
> - Use the app for your actual budgeting for 2–4 weeks
> - Share what works, what's confusing, and what's missing
> - Complete a short feedback survey at the end
>
> **What your data looks like:**
> All financial data stays on your device. The app doesn't upload anything without your explicit choice to enable sync. There's no analytics SDK. The codebase is source-available if you want to verify: [GitHub link]
>
> If you're interested, here's the sign-up form: [link]
>
> Happy to answer any questions here. This is a genuine request for feedback, not a launch announcement — the app is still in beta and I want to get it right.

**Subreddit compliance notes:**

- r/personalfinance allows self-promotion in context of community value
- Post should be tagged appropriately
- Must not feel like advertising — focus on community contribution

---

### Reddit — r/ynab

**Title:** "Built an offline-first, privacy-focused budget tracker with envelope budgeting — looking for testers"

**Post:**

> Fellow envelope budgeters,
>
> I've been a YNAB user and I love the methodology. But I wanted something that works offline, keeps data on my device, and doesn't cost $15/month for the basics.
>
> So I built Finance — an envelope budgeting app with a different philosophy:
>
> - **Offline-first:** Everything works without internet
> - **Privacy-first:** Data encrypted on your device, no bank connection needed
> - **Free core:** Complete budgeting — accounts, transactions, budgets, goals, reports — free forever
> - **Multi-platform:** Native on iOS, Android, Web, and Windows
> - **Adapts to you:** Three comfort levels change terminology and complexity
>
> I'm looking for beta testers who know envelope budgeting to give honest feedback. No sugarcoating needed — I want to know what doesn't work.
>
> The app is source-available on GitHub if you want to peek at the code: [link]
>
> Sign-up form: [link]
>
> (Mods: happy to remove if this violates any rules. Genuinely looking for feedback from this community.)

---

### Reddit — r/privacy

**Title:** "Beta testing a privacy-first budget tracker — on-device encryption, no analytics, source-available (BSL)"

**Post:**

> r/privacy,
>
> I built a personal finance app where I tried to get the privacy architecture right. Here's the approach — I'd welcome scrutiny:
>
> **Architecture:**
>
> - Local database encrypted with SQLCipher (AES-256-GCM)
> - Sensitive fields (amounts, balances, notes) encrypted end-to-end via envelope encryption
> - Keys stored in platform Keychain/Keystore (Secure Enclave, TEE, TPM)
> - Sync is opt-in — data never leaves the device unless you enable it
> - No analytics SDK, no ad tracking, no Plaid bank connection
> - Authentication via passkeys (WebAuthn/FIDO2) with OAuth 2.0 + PKCE fallback
>
> **Source:** The codebase is available under BSL-1.1 at [GitHub link]. You can read the security architecture: [ADR-0004 link]
>
> **What I'm looking for:** Beta testers who care about privacy and will poke holes in both the app and the claims. Available on iOS, Android, Web, and Windows.
>
> **What I'm NOT doing:** This isn't a "we value your privacy" marketing pitch. I'm asking for technical review from people who read privacy policies and inspect network traffic.
>
> Sign-up form: [link]

---

### Reddit — r/adhd

**Title:** "Built a budget app with cognitive accessibility in mind — looking for ADHD feedback"

**Post:**

> Hi r/adhd,
>
> I've been building a budget app called Finance, and one of our core design principles is cognitive accessibility. I'd love feedback from people with ADHD on whether we got it right (or what we got wrong).
>
> **What we designed for ADHD:**
>
> - **Simplified views** — fewer numbers, bigger text, key info only
> - **3-tap transaction entry** — the whole interaction takes under 30 seconds
> - **Reduced motion** — respects your device settings, minimal animation
> - **Non-judgmental language** — "You've used 110% of your budget — want to adjust?" instead of "OVERSPENT!!"
> - **Gentle, routine-based reminders** — same time daily, opt-in only
> - **Three comfort levels** — "Getting Started" mode hides advanced features so you're not overwhelmed
>
> **What it is:** A free, offline-first budget tracker for iOS, Android, Web, and Windows. Your data stays on your device. Source-available if you're curious.
>
> **What I'm looking for:** Beta testers who will use it for their actual budgeting and tell me honestly whether it works with their brain or against it.
>
> Sign-up form: [link]
>
> I'm not ADHD myself, so I want to learn from people who are. No assumptions — just genuine desire to make a financial tool that works for more people.

---

### Hacker News — Show HN Draft

**Title:** "Show HN: Finance – Offline-first, privacy-focused budget tracker (KMP, SQLCipher, 4 platforms)"

**Post:**

> I've been building Finance, a personal budget tracker with an unusual architecture: offline-first, edge-first, with on-device encryption.
>
> Tech stack:
>
> - Shared logic: Kotlin Multiplatform (KMP)
> - iOS: SwiftUI
> - Android: Jetpack Compose
> - Web: React + TypeScript (PWA)
> - Windows: Compose Desktop
> - Local DB: SQLDelight + SQLCipher (AES-256)
> - Sync: PowerSync (opt-in)
> - Auth: Passkeys (WebAuthn/FIDO2)
> - Backend: Supabase (PostgreSQL + Edge Functions)
>
> The core idea: your financial data shouldn't live on someone else's server. Finance stores everything locally in an encrypted SQLite database. Sync is opt-in and uses end-to-end encryption for sensitive fields.
>
> It's source-available under BSL-1.1: [GitHub link]
>
> Looking for beta testers across all 4 platforms. The core budgeting features are free forever (no trial, no feature walls). Premium will add AI insights and multi-device sync.
>
> Would love feedback on the architecture decisions and the app itself.

---

### Twitter/X Thread Draft

**Thread (5 tweets):**

**Tweet 1:**

> I've been building Finance — a budget tracker that works offline, encrypts your data on-device, and never needs your bank password.
>
> Looking for beta testers across iOS, Android, Web, and Windows. 🧵

**Tweet 2:**

> Why offline-first? Because your spending data is deeply personal. Most budget apps upload it to their servers. Finance keeps it encrypted on your device with AES-256. Sync only if you choose.

**Tweet 3:**

> We also designed it for cognitive accessibility. Simplified views, non-judgmental language, and 30-second transaction entry. Built for people who've felt overwhelmed by other finance apps.

**Tweet 4:**

> The core tracker is free forever — accounts, transactions, budgets, goals, reports. No trial. No artificial limits. Source-available under BSL 1.1.

**Tweet 5:**

> If you want to try it and give honest feedback, sign up here: [link]
>
> Looking for 40–60 testers across all platforms. Especially interested in accessibility feedback and privacy scrutiny.
>
> #PrivacyFirst #OfflineFirst #Budgeting #OpenSource

---

### Personal/Professional Network Email Template

**Subject:** Looking for beta testers for my budget app

**Body:**

> Hey [Name],
>
> I've been building a personal finance app called Finance and I'm looking for beta testers. Thought of you because [personalized reason].
>
> Quick summary: It's a budget tracker that works offline, keeps data encrypted on your device, and adapts to your comfort level with money. Works on [their platform]. Free.
>
> What I'd ask: Use it for your actual budgeting for 2–4 weeks, then tell me what worked and what didn't. Honest feedback is more valuable than positive feedback.
>
> Interested? [link to sign up] or just reply and I'll set you up.
>
> Thanks,
> [Your name]

---

## 4. Landing Page Copy

_(For human to build/deploy — providing copy only)_

### Hero Section

**Headline:** Try Finance Before Everyone Else

**Subhead:** Help us build a budget tracker that respects your privacy and works with your brain. Join the beta.

**CTA button:** Join the Beta

### What You'll Test

- Track spending in 30 seconds with 3-tap entry
- Envelope budgeting that adapts to your comfort level
- Offline-first — works without internet
- All data encrypted on your device
- Native on iOS, Android, Web, and Windows

### What We're Looking For

Honest feedback from real people:

- Does the app make financial tracking feel easier or harder?
- Is the privacy architecture clear and trustworthy?
- Does the expertise-tiered UI actually help?
- What's missing? What's confusing?

We're especially looking for:

- People who've felt overwhelmed by other finance apps
- People who care about data privacy
- People who budget across multiple devices
- People with accessibility needs (screen readers, motor, cognitive)

### What Your Data Looks Like

All your financial data stays on your device, encrypted. We don't collect analytics. We don't upload your data. The codebase is source-available — you can verify every claim.

### Footer

Finance is developed openly at [GitHub link]. Read our [Privacy Policy]. Questions? [Contact].

---

## 5. Screening Questionnaire

### Required Questions

1. **What platform(s) will you test on?** (Multi-select: iOS, Android, Web, Windows)
2. **How do you currently track your finances?** (Spreadsheet / YNAB / Monarch / Other app / Don't currently track / Other)
3. **How comfortable are you with financial concepts?** (New to budgeting / Comfortable / Very experienced)
4. **How important is privacy in a financial app to you?** (Not important / Somewhat / Very / It's a dealbreaker)
5. **Do you have any accessibility needs we should know about?** (Free text, optional) — e.g., screen reader, motor, cognitive, visual

### Optional Questions

6. **What's your biggest frustration with your current financial tool (if any)?** (Free text)
7. **Would you be willing to share a brief testimonial if you enjoy the experience?** (Yes / No / Maybe)
8. **How did you hear about Finance?** (Reddit / HN / Twitter / Word of mouth / Other)

### Selection Criteria (Internal)

Prioritize to ensure diversity:

- [ ] ≥3 testers per platform
- [ ] ≥3 accessibility testers (self-identified)
- [ ] ≥3 "new to budgeting" testers (Getting Started tier validation)
- [ ] ≥3 privacy-motivated testers (r/privacy, technical scrutiny)
- [ ] ≥2 YNAB/envelope budgeting experienced testers
- [ ] Mix of genders, ages, financial situations (based on available info)

---

## 6. Beta Tester Welcome Sequence

### Email 1: Welcome (Sent on acceptance)

**Subject:** Welcome to the Finance beta 🎉

**Body:**

> Hi [Name],
>
> Welcome to the Finance beta! Thanks for offering to help us build something better.
>
> **Getting started:**
>
> - [Platform-specific install instructions]
> - The app works immediately — no account required for local use
> - Try the "Getting Started" or "Comfortable" expertise tier to start
>
> **What to expect:**
>
> - This is beta software. You'll find bugs. That's normal.
> - Your feedback directly shapes what we build and fix
> - All your financial data stays on your device, encrypted
>
> **How to share feedback:**
>
> - In-app: [feedback mechanism]
> - Email: beta@[domain]
> - GitHub Discussions: [link]
>
> **One ask:** Try to use Finance for your actual budgeting, not just a test. Real usage generates real feedback.
>
> Questions? Reply to this email — a human reads every one.
>
> — The Finance team

### Email 2: Week 1 Check-In (Day 7)

**Subject:** How's your first week with Finance?

**Body:**

> Hi [Name],
>
> You've had Finance for a week now. How's it going?
>
> **Quick pulse check:**
>
> - Have you added any transactions?
> - Did you set up a budget?
> - Anything confuse you or feel frustrating?
>
> If you haven't opened the app yet — no judgment. Life happens. But if something about the setup or first experience stopped you, we'd love to know what it was.
>
> **This week's focus areas** (if you have time):
>
> - Try the quick-entry flow (3 taps to add a transaction)
> - Explore the budget view and assign money to categories
> - Check if the expertise tier you chose feels right
>
> Reply with any thoughts — even a one-liner helps.
>
> — The Finance team

### Email 3: Feedback Request (Day 14–21)

**Subject:** Your feedback shapes Finance — quick survey inside

**Body:**

> Hi [Name],
>
> You've been using Finance for [X] weeks. We'd love your structured feedback.
>
> **5-minute survey:** [link]
>
> **What we're asking:**
>
> - Overall satisfaction (1–10)
> - What's the best thing about Finance?
> - What's the most frustrating thing?
> - Would you recommend it? Why or why not?
> - What's missing?
> - How does it compare to tools you've used before?
>
> **Your answers are anonymous by default.** If you'd be open to us quoting you (first name only, or anonymous), there's an opt-in at the end.
>
> Whether your feedback is positive or critical, it's equally valuable. We'd rather hear "this doesn't work" now than after launch.
>
> Thank you for being part of this.
>
> — The Finance team

---

## 7. Timeline

| Week       | Activity                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| **Week 0** | Finalize recruitment copy, set up sign-up form, prepare install guides   |
| **Week 1** | Publish recruitment posts (Reddit, HN, Twitter), begin personal outreach |
| **Week 2** | Review applications, send acceptance emails, onboard first cohort        |
| **Week 3** | Week 1 check-in email, collect initial bug reports                       |
| **Week 4** | Continue onboarding (stagger if needed), mid-beta check-in               |
| **Week 5** | Feedback survey distributed, compile initial insights                    |
| **Week 6** | Beta feedback report compiled (feeds into Sprint 4 insights)             |

---

## 8. Success Metrics

| Metric                     | Target                          | Measurement                      |
| -------------------------- | ------------------------------- | -------------------------------- |
| Applications received      | 80+ (2:1 ratio for 40 accepted) | Sign-up form count               |
| Testers onboarded          | 40–60                           | Acceptance emails sent           |
| Platform coverage          | ≥5 per platform                 | Screening questionnaire          |
| Accessibility testers      | ≥5                              | Self-identified in screening     |
| Week 1 retention           | ≥70% opened app in week 1       | Check-in email response          |
| Feedback survey completion | ≥60% of accepted testers        | Survey tool analytics            |
| Actionable bug reports     | ≥20                             | GitHub Issues / feedback channel |
| Testimonials (opted in)    | ≥5                              | Survey opt-in question           |

---

## References

- [Brand Voice Guide](brand-voice-guide.md) — Tone and vocabulary for all recruitment copy
- [Competitive Positioning](competitive-positioning.md) — Differentiators to highlight
- [Personas](../design/personas.md) — Target tester profiles
- [Product Identity](../design/product-identity.md) — Feature list and freemium model
