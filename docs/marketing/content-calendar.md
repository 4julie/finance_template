# Content Calendar & Blog Strategy

> **Issue:** [#839](https://github.com/jrmoulckers/finance/issues/839)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 2
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Brand Voice Guide](brand-voice-guide.md) · [Competitive Positioning](competitive-positioning.md)

---

## Table of Contents

1. [Content Strategy Overview](#1-content-strategy-overview)
2. [12-Week Editorial Calendar](#2-12-week-editorial-calendar)
3. [Blog Post Draft 1: Why We Built Finance Offline-First](#3-blog-post-draft-1-why-we-built-finance-offline-first)
4. [Blog Post Draft 2: Budgeting Without the Guilt Trip](#4-blog-post-draft-2-budgeting-without-the-guilt-trip)
5. [Blog Post Draft 3: Your Financial App Shouldn't Need Your Bank Password](#5-blog-post-draft-3-your-financial-app-shouldnt-need-your-bank-password)
6. [Social Media Templates](#6-social-media-templates)
7. [Content Distribution Strategy](#7-content-distribution-strategy)

---

## 1. Content Strategy Overview

### Content Pillars

| Pillar                        | Purpose                                                                    | Audience                                | Frequency |
| ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------- | --------- |
| **Privacy & Architecture**    | Explain why and how Finance protects data                                  | Privacy-conscious, technical            | Bi-weekly |
| **Financial Wellness**        | Help people build better money habits (not Finance-specific)               | General audience, SEO                   | Weekly    |
| **Product Updates**           | Share what's new, what's coming, what we learned                           | Existing users, beta testers            | As needed |
| **Accessibility & Inclusion** | Highlight cognitive/visual/motor accessibility design                      | ADHD community, accessibility advocates | Monthly   |
| **Build in Public**           | Share development decisions, architecture choices, AI-assisted development | Developers, open source community       | Bi-weekly |

### Content Principles

- **Valuable without Finance** — Every post should help the reader even if they never use our app
- **Technically honest** — Architecture posts cite specific code and ADRs
- **Non-promotional first** — Lead with insight, end with relevance to Finance (if natural)
- **SEO-conscious** — Target keywords from ASO research for organic discovery
- **Accessible** — Plain language, Flesch-Kincaid ≤ 8th grade for general content

---

## 2. 12-Week Editorial Calendar

### Legend

- 📝 Blog post (1200–1800 words)
- 🐦 Social media (Twitter/X, LinkedIn, Threads)
- 📢 Announcement
- 🎯 Community engagement (Reddit, HN)

### Weeks 1–4: Pre-Beta (Content Foundation)

| Week  | Monday                                                    | Wednesday                                                          | Friday                                                      |
| ----- | --------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| **1** | 📝 "Why We Built Finance Offline-First"                   | 🐦 Thread: 5 things your budget app knows about you                | 🐦 Quote card: "Your money, your device, your control"      |
| **2** | 📝 "Budgeting Without the Guilt Trip"                     | 🐦 Thread: Non-judgmental vs. judgmental finance app copy examples | 🎯 Share budgeting tip in r/personalfinance (no self-promo) |
| **3** | 📝 "Your Financial App Shouldn't Need Your Bank Password" | 🐦 Thread: How Plaid works and what it sees                        | 🐦 Poll: "What matters most in a budget app?"               |
| **4** | 📢 Beta announcement post                                 | 🐦 Thread: What we're testing and why beta matters                 | 🎯 Beta recruitment posts go live (Reddit, HN)              |

### Weeks 5–8: Beta Period (Build Trust + Community)

| Week  | Monday                                                              | Wednesday                                                   | Friday                                                 |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| **5** | 📝 "Designing for ADHD: What We Learned Building Finance"           | 🐦 Screenshot: expertise tier comparison                    | 🐦 Quote: Casey persona story (anonymized)             |
| **6** | 📝 "How We Encrypt Your Financial Data (Technical Deep Dive)"       | 🐦 Thread: SQLCipher + envelope encryption explained simply | 🎯 Helpful comment in r/privacy about local encryption |
| **7** | 📝 "The 30-Second Budgeting Habit: Why Speed Matters"               | 🐦 Quick video/GIF: 3-tap transaction entry                 | 🐦 Stat: "Average Finance transaction takes X seconds" |
| **8** | 📝 "Building a Multi-Platform App with KMP: Architecture Decisions" | 🐦 Thread: KMP pros and cons from real production use       | 🎯 Post in Kotlin/KMP community                        |

### Weeks 9–12: Pre-Launch (Momentum + Anticipation)

| Week   | Monday                                                        | Wednesday                                       | Friday                                                   |
| ------ | ------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| **9**  | 📝 "What Our Beta Testers Taught Us"                          | 🐦 Thread: 5 changes we made from beta feedback | 🐦 Thank-you post to beta community                      |
| **10** | 📝 "Why Finance Is Source-Available (And What BSL-1.1 Means)" | 🐦 Thread: Open source vs. source-available     | 🎯 Discuss BSL in relevant HN thread                     |
| **11** | 📢 Launch date announcement                                   | 🐦 Countdown: "One week until Finance launches" | 🐦 Feature spotlight: one feature per day (5-day series) |
| **12** | 📢 **LAUNCH DAY** — Press release, PH, HN, social             | 🐦 Launch thread + engagement                   | 📝 "Finance Is Live: What We Built and Why"              |

---

## 3. Blog Post Draft 1: Why We Built Finance Offline-First

**Target keywords:** offline budget app, offline-first finance, privacy budget tracker
**Word count:** ~1,500 words
**Audience:** Privacy-conscious users, technical readers
**CTA:** Try Finance (beta link or app store link)

---

### Why We Built Finance Offline-First

Most financial apps need the internet to show you your own money. We thought that was strange.

Your bank balance doesn't change because your WiFi is down. Your budget doesn't disappear because you're on a plane. Yet most personal finance apps treat offline as a broken state — a spinner, a "no connection" error, a grayed-out interface.

When we started building Finance, we made a decision that shaped everything else: **your financial data lives on your device first.** The internet is optional.

#### What "offline-first" actually means

Offline-first isn't just "it works without internet sometimes." It's an architecture decision that puts your device at the center:

1. **All data is stored locally.** When you add a transaction, it's written to an encrypted SQLite database on your device. No server round-trip. No loading spinner. Instant.

2. **The app is fully functional offline.** Add transactions, check budgets, review reports, set goals — everything works without a network connection. Not a degraded version. The full app.

3. **Sync is additive, not essential.** If you enable multi-device sync (a premium feature), changes are pushed to your other devices when connectivity is available. But the app never _requires_ sync to function.

This is the same principle behind apps like Signal — your messages exist on your device first. The server coordinates delivery, but the message is yours.

#### Why this matters for your finances

Financial data is uniquely personal. Your transaction history reveals your habits, your health decisions, your relationships, your vices, your values. It's arguably more intimate than your email.

When your financial app requires internet access, that data is flowing to and from a remote server. Usually encrypted in transit, yes. But stored on someone else's infrastructure, under someone else's access control policies, subject to someone else's data breach risks.

With Finance, your financial data is encrypted on your device using AES-256 encryption (SQLCipher). The encryption key is stored in your device's secure hardware — Secure Enclave on iOS, TEE on Android, TPM on Windows. Even if someone physically took your device, they can't read your financial data without your biometric or PIN.

#### The architecture behind it

For the technical readers: Finance uses Kotlin Multiplatform (KMP) for shared business logic across iOS, Android, Web, and Windows. The local database is SQLDelight with SQLCipher for encryption at rest.

When sync is enabled, we use PowerSync for delta synchronization. Only changes (deltas) are transmitted, and sensitive fields (amounts, balances, notes) are encrypted end-to-end before leaving your device. The server sees metadata needed for sync coordination (timestamps, categories) but can't read your financial details.

The full architecture is documented in our public repository: [link to ADR-0004].

#### What we gave up

Being honest: offline-first has trade-offs. Some features that are trivial for server-first apps require careful design for us:

- **Search across encrypted fields** is more complex when the server can't index plaintext
- **Real-time collaboration** (household budgets) requires conflict resolution logic
- **AI features** need local model inference or careful server-side processing of encrypted data

We think these trade-offs are worth it. Your financial privacy isn't a feature we're willing to compromise for engineering convenience.

#### The bottom line

Finance works offline because we believe your financial data belongs on your device, not on our servers. The internet is a tool for keeping your devices in sync — when you choose. Not a requirement for seeing your own money.

If you've ever been frustrated by a budget app that doesn't work on a plane, in a basement, or in a country with spotty coverage — Finance was built for you.

---

_Finance is free to use, works on iOS, Android, Web, and Windows, and keeps your data encrypted on your device. [Try the beta / Download Finance]_

---

## 4. Blog Post Draft 2: Budgeting Without the Guilt Trip

**Target keywords:** non-judgmental budget app, ADHD budget app, budgeting anxiety
**Word count:** ~1,400 words
**Audience:** General audience, ADHD/neurodivergent community
**CTA:** Try Finance

---

### Budgeting Without the Guilt Trip

Open most budget apps after a spendy weekend and you'll see red. Literally — red numbers, red warnings, red notifications telling you that you overspent.

It's Monday. You already know. The last thing you need is your phone shaming you about brunch.

We built Finance on a simple principle: **present facts, not judgments.** Because guilt doesn't help you budget better. Information does.

#### The problem with judgmental finance apps

Most budgeting apps borrow from the same playbook:

- 🔴 Red for "bad" (over budget)
- 🟢 Green for "good" (under budget)
- ⚠️ Push notifications when you "overspend"
- 📊 Comparisons: "You spent more than 80% of people your age"

This approach assumes shame is a motivator. For some people, it might work short-term. But for many — especially people with anxiety, ADHD, or complicated relationships with money — it's actively harmful.

It leads to app avoidance. The irony: the people who most need to track their spending stop opening the app because it makes them feel bad.

#### How Finance does it differently

**Neutral language, always.** When you go over budget in a category, Finance tells you:

> "You've used 110% of your Food budget — want to adjust?"

Not: "You overspent on Food! 🚨"

The difference is subtle but meaningful. The first is informational. It acknowledges reality and offers you a choice. The second is a judgment — it assigns moral value to your spending.

**No shame colors.** We don't use red to signal "bad." Our visual indicators use neutral tones that convey information without emotional weight. Over budget? You see the number and a gentle indicator. The app doesn't add anxiety to the situation — life does enough of that.

**Celebratory, not punitive.** When things go well, Finance notices:

> "3-week streak of tracking daily!"
> "Emergency fund fully funded! That took dedication."

When things go less well? Nothing. No notification saying you broke a streak. No "you haven't logged a transaction in 3 days!" guilt message. When you come back, it's just:

> "Welcome back! Your data is right where you left it."

#### Designed for every brain

We designed Finance with cognitive accessibility as a foundation, not an afterthought. Inspired by Tiimo's disability-inclusive design approach, we built three features specifically for people whose brains work differently:

**Expertise tiers.** Three levels that change the entire experience:

- 🌱 Getting Started — plain language, simplified views, guided prompts
- 📊 Comfortable — standard features and terminology
- 🧠 Advanced — detailed breakdowns and power-user shortcuts

You choose your level during setup and can switch anytime. No judgment, no "are you sure you want the easy mode?" — just different views of the same data.

**Reduced motion.** Finance respects your device's reduced motion setting. Minimal animation by default. No bouncing charts, no flying numbers, no visual noise.

**30-second habit loop.** The daily interaction with Finance is designed to be short: open, add a transaction (3 taps), glance at your budget, close. Under 30 seconds. This matters because building a financial habit is harder when the app demands 10 minutes of your attention.

#### Facts build confidence

When you remove judgment from financial tracking, something interesting happens: people check their finances more often. Not because they're scared of what they'll see, but because the app is safe. It's just information.

And more information leads to better decisions. Not because the app told you what to do, but because you understood your situation clearly enough to decide for yourself.

That's the difference between financial management and financial wellness. Management is about control. Wellness is about understanding.

Finance is a tool for understanding.

---

_Finance is a free, offline-first budget tracker that presents facts, not judgments. Available on iOS, Android, Web, and Windows. [Try the beta / Download Finance]_

---

## 5. Blog Post Draft 3: Your Financial App Shouldn't Need Your Bank Password

**Target keywords:** private budget app, budget app no bank connection, Plaid privacy
**Word count:** ~1,500 words
**Audience:** Privacy-conscious, Plaid-skeptical users
**CTA:** Try Finance

---

### Your Financial App Shouldn't Need Your Bank Password

When you download a budget app, one of the first things it asks for is your bank login credentials. This has become so normal that people don't question it. But let's step back and think about what's actually happening.

You're giving a third-party company the keys to read every transaction in your bank account. Every paycheck. Every medical bill. Every subscription. Every gift. Every cash withdrawal. Everything.

And they give that access to the budget app, which stores it on their servers. Encrypted, sure. But on _their_ servers, under _their_ access controls, subject to _their_ data breach risks.

We built Finance to work without any of that.

#### How bank connections actually work

Most budget apps use a service called Plaid (owned by Visa) or MX to connect to your bank. Here's the simplified flow:

1. You enter your bank credentials in the app
2. The app sends them to Plaid
3. Plaid logs into your bank as you
4. Plaid downloads your transactions
5. Plaid sends them to the budget app's server
6. The budget app displays them

At each step, your data exists on someone else's infrastructure. Your bank credentials have been handled by at least two companies beyond your bank. Your transaction history now lives in at least three places: your bank, Plaid, and the app's servers.

Is this necessarily dangerous? Not always. Plaid takes security seriously. But it's a lot of trust to place in companies whose business model involves processing your financial data.

#### The alternative: manual-entry-first

Finance takes a different approach. When you add a transaction, you type the amount, pick a category, and save. It takes about 5 seconds.

"But that's more work!" — yes, slightly. And we think it's worth it for three reasons:

**1. You actually process what you spend.** Research on budgeting habits consistently shows that manual entry creates more spending awareness than automatic imports. The act of typing "$4.50 – coffee" makes you conscious of the spending in a way that a line item you never looked at doesn't.

**2. Your data never leaves your device.** When you manually enter a transaction, it's stored in an encrypted database on your phone. No server. No third party. No Plaid. If your phone is lost, the data is encrypted — unusable without your biometric or PIN.

**3. You control what's tracked.** Some people don't want every transaction logged. Cash gifts. Medical expenses. Personal purchases. Manual entry means you decide what enters the system.

#### "But I don't have time to enter every transaction"

Valid concern. Finance addresses this with:

- **3-tap quick entry** — Amount → Category → Save. Under 30 seconds.
- **Smart suggestions** — The app learns your patterns and suggests categories.
- **Widget access** — Quick-entry from your home screen without opening the full app.
- **Batch entry** — Sit down once a day or once a week and log everything at once.

Is it faster than automatic imports? No. Is it more private? Significantly. That's the trade-off, and we think it's one worth offering.

#### Where we draw the line

We want to be clear: we're not saying bank-connected apps are evil. For many people, the convenience outweighs the privacy concerns. Plaid and MX are legitimate companies with real security practices.

We're saying there should be a choice. Right now, the budget app market assumes everyone is comfortable with bank connections. If you're not — if you've read about data breaches, or you simply prefer to keep your financial data local — your options are limited.

Finance exists for people who want that choice.

#### What about future bank connections?

We may add bank connection support in the future — as an entirely opt-in feature. If we do, it will be clearly separated from the core experience, with explicit explanations of what data goes where.

But bank connections will never be required. Manual entry will always be a first-class citizen in Finance.

#### The bigger picture

The personal finance app industry has normalized giving third parties access to your most sensitive financial data. We think there's room for an alternative — an app that treats your financial data like the sensitive information it is.

Your budget app shouldn't need your bank password. Your spending data shouldn't live on a corporate server. And you shouldn't have to choose between financial clarity and financial privacy.

---

_Finance is a free, offline-first budget tracker that never asks for your bank password. Available on iOS, Android, Web, and Windows. [Try the beta / Download Finance]_

---

## 6. Social Media Templates

### Twitter/X Templates (10 posts)

**Post 1 — Privacy hook:**

> Your budget app probably knows more about you than your best friend.
>
> Every transaction. Every paycheck. Every late-night purchase.
>
> Finance keeps all of that on your device, encrypted. We can't see it even if we wanted to.

**Post 2 — Speed hook:**

> Most people don't track spending because it takes too long.
>
> Finance: 3 taps. 30 seconds. Done.
>
> Amount → Category → Save. That's it.

**Post 3 — Non-judgmental hook:**

> Budget apps when you overspend: "🚨 OVERSPENT!! You need to do better!!"
>
> Finance when you overspend: "You've used 110% of your Food budget — want to adjust?"
>
> Facts, not judgments.

**Post 4 — ADHD/accessibility hook:**

> We built Finance with cognitive accessibility as a design principle.
>
> • Simplified views that don't overwhelm
> • 30-second daily interaction
> • Reduced motion by default
> • Non-judgmental language throughout
>
> Budget apps should work with your brain, not against it.

**Post 5 — Offline hook:**

> Your bank balance doesn't change because your WiFi is down.
>
> So why does your budget app need internet to show you your own money?
>
> Finance works fully offline. As it should.

**Post 6 — Platform hook:**

> Finance is native on 4 platforms:
>
> 📱 iOS — SwiftUI
> 🤖 Android — Jetpack Compose
> 🌐 Web — React PWA
> 💻 Windows — Compose Desktop
>
> Not a web view in a native shell. Actually native.

**Post 7 — Free tier hook:**

> Finance's free tier includes:
> ✅ Unlimited accounts
> ✅ Unlimited transactions
> ✅ Unlimited budgets
> ✅ Goals and reports
> ✅ Full offline access
>
> No trial. No feature walls. No ads.
>
> Just a complete budget tracker. Free forever.

**Post 8 — Open source hook:**

> Finance is source-available under BSL 1.1.
>
> You can read every line of code that handles your financial data.
>
> Privacy claims are verifiable, not just marketing: [GitHub link]

**Post 9 — Methodology hook:**

> Envelope budgeting is powerful but apps make it complicated.
>
> Finance's approach: give every dollar a purpose. Track what's left. Adjust as life happens.
>
> Three expertise tiers mean it's accessible whether you're new to budgeting or a power user.

**Post 10 — Emotional hook:**

> I built Finance because I wanted a budget app that didn't:
>
> ❌ Sell my data
> ❌ Need my bank password
> ❌ Require internet
> ❌ Shame me for spending
> ❌ Charge $15/month for basics
>
> It exists now. And it's free.

### LinkedIn Templates (5 posts)

**Post 1 — Builder story:**

> I've been building Finance — a personal budget tracker with an unusual philosophy: your financial data should stay on your device.
>
> Most finance apps upload your data to remote servers, connect to your bank via Plaid, and charge $10–15/month. We took a different approach: offline-first, encrypted, and free at the core.
>
> The architecture is source-available — anyone can verify our privacy claims.
>
> Looking for beta testers. Link in comments.

**Post 2 — Technical credibility:**

> Building a truly multi-platform app with Kotlin Multiplatform in production:
>
> Our shared KMP layer handles business logic, data models, and sync across iOS (SwiftUI), Android (Jetpack Compose), Web (React), and Windows (Compose Desktop).
>
> Local databases encrypted with SQLCipher. Sync via PowerSync with E2E for sensitive fields.
>
> Open architecture docs: [link]

**Post 3 — Accessibility angle:**

> We designed Finance with cognitive accessibility as a foundation:
>
> • Three expertise tiers adapt terminology and complexity
> • Non-judgmental language ("facts, not judgments")
> • 30-second transaction entry
> • Reduced motion by default
>
> Financial apps have left neurodivergent users behind. We're trying to change that.

**Post 4 — Privacy thought leadership:**

> Your financial transaction history reveals more about you than almost any other data set: your health, relationships, habits, income, values.
>
> Most budget apps store this data on their servers. Finance keeps it encrypted on your device.
>
> Privacy isn't a feature — it's an architecture decision.

**Post 5 — Launch/milestone:**

> Finance is now in beta across 4 platforms: iOS, Android, Web, and Windows.
>
> What makes it different:
> ✅ Offline-first — works without internet
> ✅ On-device encryption (AES-256)
> ✅ No bank connection required
> ✅ Cognitive accessibility built-in
> ✅ Free forever (core features)
> ✅ Source-available (BSL 1.1)
>
> Looking for feedback. Link in comments.

---

## 7. Content Distribution Strategy

### Owned Channels

| Channel              | Content Type                  | Frequency          |
| -------------------- | ----------------------------- | ------------------ |
| Blog (website)       | Long-form posts               | Weekly             |
| Twitter/X            | Short-form, threads           | 3x/week            |
| LinkedIn             | Professional, builder updates | 1–2x/week          |
| GitHub Discussions   | Technical, community          | As needed          |
| Email (beta testers) | Updates, surveys              | Weekly during beta |

### Earned Channels (Community)

| Channel           | Approach                                               | Frequency                       |
| ----------------- | ------------------------------------------------------ | ------------------------------- |
| r/personalfinance | Helpful comments, occasional self-post (compliant)     | 2x/week comments, 1x/month post |
| r/privacy         | Engage in privacy discussions, share technical details | 1x/week                         |
| r/ynab            | Help YNAB users, mention alternative when relevant     | 1x/week                         |
| r/adhd            | Share accessibility design learnings                   | 1x/month                        |
| Hacker News       | Engage in relevant threads, Show HN at beta/launch     | 2x total                        |

### Content Repurposing

| Original         | Repurposed Into                                                                         |
| ---------------- | --------------------------------------------------------------------------------------- |
| Blog post        | Twitter thread (key points), LinkedIn post (summary), Reddit comment (relevant excerpt) |
| Blog post        | Newsletter segment                                                                      |
| Screenshot spec  | Social media visual assets                                                              |
| Architecture doc | Technical blog post ("How we built X")                                                  |
| Beta feedback    | "What we learned" blog post                                                             |

---

## References

- [Brand Voice Guide](brand-voice-guide.md) — Tone and vocabulary
- [ASO Research](aso-keyword-research.md) — Target keywords for SEO alignment
- [Competitive Positioning](competitive-positioning.md) — Differentiation messaging
- [ADR-0004: Auth & Security](../architecture/0004-auth-security-architecture.md) — Technical claims for privacy posts
- [Product Identity](../design/product-identity.md) — Feature details for content accuracy
