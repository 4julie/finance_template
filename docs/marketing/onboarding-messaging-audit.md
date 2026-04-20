# Onboarding-to-Retention Messaging Audit

> **Issue:** [#848](https://github.com/jrmoulckers/finance/issues/848)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 4
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Onboarding Flow](../architecture/onboarding-flow.md) · [Brand Voice Guide](brand-voice-guide.md) · [UX Principles](../design/ux-principles.md) · [Product Identity](../design/product-identity.md)

---

## Table of Contents

1. [Audit Scope & Methodology](#1-audit-scope--methodology)
2. [Onboarding Flow Copy Audit](#2-onboarding-flow-copy-audit)
3. [Empty State Messaging Audit](#3-empty-state-messaging-audit)
4. [Notification Copy Audit](#4-notification-copy-audit)
5. [Conversion Point Messaging Audit](#5-conversion-point-messaging-audit)
6. [Day 1–7 Experience Map](#6-day-17-experience-map)
7. [Findings & Recommendations](#7-findings--recommendations)
8. [Revised Copy Recommendations](#8-revised-copy-recommendations)

---

## 1. Audit Scope & Methodology

### What This Audit Covers

All user-facing copy from first launch through day 7 of use, evaluated against:

1. **Brand voice guide** — Tone, vocabulary, do/don't examples
2. **Non-judgmental principles** — No guilt, shame, or pressure
3. **Accessibility** — Plain language, clear instructions, no assumptions
4. **Privacy alignment** — Privacy claims accurate and present where needed
5. **Autonomy** — User is always in control; no dark patterns
6. **Inclusivity** — No assumptions about income, financial literacy, or ability

### Evaluation Framework

Each copy element is evaluated on a 3-point scale:

| Rating        | Meaning                                       |
| ------------- | --------------------------------------------- |
| ✅ **Pass**   | Fully aligned with brand voice and principles |
| ⚠️ **Adjust** | Minor wording changes recommended             |
| ❌ **Fail**   | Violates brand principles; must be rewritten  |

---

## 2. Onboarding Flow Copy Audit

### Welcome Screen

| Element       | Current Copy                               | Rating | Recommendation                                                      |
| ------------- | ------------------------------------------ | ------ | ------------------------------------------------------------------- |
| Headline      | "Welcome to Finance"                       | ⚠️     | Consider: "See your money clearly" — benefit-first, not brand-first |
| Subhead       | "Your finances, your device, your control" | ✅     | Strong — communicates value and privacy immediately                 |
| Path A button | "Just let me in"                           | ✅     | Perfect — respects user autonomy, no pressure to personalize        |
| Path B button | "Personalize my experience"                | ✅     | Clear, optional, no implied superiority over Path A                 |
| Privacy line  | "All data stays on this device, encrypted" | ✅     | Good placement — trust established immediately                      |

### Path B: Personalization Flow

| Step            | Current Copy                                            | Rating | Recommendation                                                                                          |
| --------------- | ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Step 1 question | "How do you feel about your money?"                     | ✅     | Emotion-first, not form-first. Excellent.                                                               |
| Step 1 options  | Various emotional states                                | ⚠️     | Verify options are inclusive — avoid implying "correct" answers. Each option should feel equally valid. |
| Step 2          | "What currency do you use?" + "Name your first account" | ✅     | Combined into one step — efficient                                                                      |
| Step 3          | "What matters most to you?"                             | ✅     | Seeds first budget/goal without overwhelming                                                            |
| Final           | "You're ready."                                         | ✅     | Simple, affirming, no forced next action                                                                |

### Skip Behavior

| Element           | Current Behavior          | Rating | Recommendation                                     |
| ----------------- | ------------------------- | ------ | -------------------------------------------------- |
| Skip button       | Present on every step     | ✅     | Essential — never trap users in onboarding         |
| Skip confirmation | No "Are you sure?" dialog | ✅     | Correct — per onboarding-flow.md, no guilt on skip |
| Skip destination  | Dashboard with defaults   | ✅     | Functional immediately — no degraded experience    |

### Overall Onboarding Assessment

**Grade:** ✅ Strong — Aligned with non-manipulative, privacy-first principles

**Minor recommendations:**

1. Welcome screen headline could be more benefit-focused
2. Ensure emotion options in Step 1 don't inadvertently rank financial health
3. Add explicit "You can change any of this later" language on each step

---

## 3. Empty State Messaging Audit

Empty states are what users see before they've entered any data. These are critical first impressions.

### Accounts Screen (No Accounts)

| Element                | Recommended Copy                                                                  | Rating Guidance                          |
| ---------------------- | --------------------------------------------------------------------------------- | ---------------------------------------- |
| Headline               | "No accounts yet"                                                                 | ✅ Factual, no pressure                  |
| Body                   | "Add your first account — checking, savings, or cash. It takes about 10 seconds." | ✅ Actionable, time-framed, low pressure |
| CTA                    | "Add Account"                                                                     | ✅ Clear, simple                         |
| **Anti-pattern check** | ❌ Must NOT say: "Get started by adding all your accounts!"                       | Overwhelming                             |

### Transactions Screen (No Transactions)

| Element                | Recommended Copy                                                    | Rating Guidance                            |
| ---------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Headline               | "No transactions yet"                                               | ✅ Factual                                 |
| Body                   | "Add your first transaction — it takes 3 taps."                     | ✅ Benefit-framed (speed), not obligation  |
| Supporting             | "Your transaction data stays right here on your device, encrypted." | ✅ Privacy reassurance at the right moment |
| CTA                    | "Add Transaction"                                                   | ✅                                         |
| **Anti-pattern check** | ❌ Must NOT say: "You haven't tracked any spending yet! Start now!" | Guilt + urgency                            |

### Budget Screen (No Budgets)

| Element                | Recommended Copy                                                                             | Rating Guidance                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Headline               | "No spending plan yet"                                                                       | ✅ Uses "spending plan" per vocabulary guide (less intimidating than "budget") |
| Body                   | "Set a plan for any category — food, transportation, entertainment. Adjust as life happens." | ✅ Flexible, no judgment                                                       |
| CTA                    | "Create a Plan"                                                                              | ✅                                                                             |
| **Anti-pattern check** | ❌ Must NOT say: "You need a budget! Every dollar should have a job."                        | Prescriptive + guilt                                                           |

### Goals Screen (No Goals)

| Element                | Recommended Copy                                                           | Rating Guidance                               |
| ---------------------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| Headline               | "No goals yet"                                                             | ✅                                            |
| Body                   | "Saving for something? Track your progress and see when you'll get there." | ✅ Optional framing ("Saving for something?") |
| CTA                    | "Add a Goal"                                                               | ✅                                            |
| **Anti-pattern check** | ❌ Must NOT say: "You should be saving for the future!"                    | Prescriptive + guilt                          |

### Reports Screen (Insufficient Data)

| Element                | Recommended Copy                                                          | Rating Guidance                           |
| ---------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| Headline               | "Not enough data yet"                                                     | ✅                                        |
| Body                   | "After a few transactions, you'll see spending patterns and trends here." | ✅ Forward-looking, not demanding         |
| CTA                    | None needed — passive state                                               | ✅                                        |
| **Anti-pattern check** | ❌ Must NOT say: "Track more transactions to unlock insights!"            | Gamification pressure + "unlock" language |

### Overall Empty State Assessment

**Principles for all empty states:**

- Lead with a factual statement ("No X yet")
- Follow with a low-pressure action ("Add one — it takes N seconds/taps")
- Never imply the user is behind or lacking
- Include privacy reassurance where relevant
- Never use "unlock" language (implies features are withheld)

---

## 4. Notification Copy Audit

### Daily Snapshot (Opt-In)

| Element                | Recommended Copy                                                   | Rating Guidance                      |
| ---------------------- | ------------------------------------------------------------------ | ------------------------------------ |
| Title                  | "Today's snapshot"                                                 | ✅ Informational                     |
| Body                   | "Yesterday you spent $47. Your week is on track. ✅"               | ✅ Factual, positive when applicable |
| Over budget variant    | "Yesterday you spent $89. You've used 92% of your weekly plan."    | ✅ Factual, no judgment              |
| **Anti-pattern check** | ❌ Must NOT say: "You overspent yesterday! Check your budget now!" | Alarm + guilt + urgency              |

### Weekly Insight (Opt-In)

| Element                | Recommended Copy                                                                     | Rating Guidance                                 |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Title                  | "Your week in review"                                                                | ✅                                              |
| Body                   | "This week: $312 spent. Biggest category: Dining ($89). You're $43 under your plan." | ✅ Factual, informative, positive               |
| Over plan variant      | "This week: $487 spent. Biggest category: Shopping ($156). Your plan was $400."      | ✅ Factual — presents numbers, lets user decide |
| **Anti-pattern check** | ❌ Must NOT say: "You went over budget this week! 🚨 You need to cut back."          | Judgment + shame + prescription                 |

### Streak Messages

| Situation              | Recommended Copy                                                        | Rating Guidance                                      |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Streak active          | "5-day streak of tracking! 🎯"                                          | ✅ Celebratory                                       |
| Streak broken          | _No notification sent_                                                  | ✅ **Critical — do NOT notify about broken streaks** |
| Return after absence   | "Welcome back! Your data is right where you left it."                   | ✅ Warm, no guilt                                    |
| **Anti-pattern check** | ❌ Must NOT say: "You broke your streak! 😢 Don't let it happen again!" | Guilt + shame + manipulation                         |

### Goal Milestones

| Situation      | Recommended Copy                                                         | Rating Guidance          |
| -------------- | ------------------------------------------------------------------------ | ------------------------ |
| 25% milestone  | "Emergency fund: 25% there ($2,500 of $10,000). You're making progress." | ✅                       |
| 50% milestone  | "Emergency fund: halfway! $5,000 of $10,000."                            | ✅                       |
| 100% milestone | "Emergency fund: fully funded! 🎉 That took dedication."                 | ✅ Genuine celebration   |
| Behind pace    | _No notification_ — only show projection in-app if user checks           | ✅ Don't nag about goals |

### Notification Opt-In Flow

| Element                | Recommended Approach                                                                | Rating Guidance                     |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------- |
| Initial prompt         | "Would you like daily spending snapshots? You can adjust this anytime in Settings." | ✅ Clear, optional, changeable      |
| Frequency options      | Daily / Weekly / Never                                                              | ✅ User controls cadence            |
| Timing options         | "When would you like check-ins?" + time picker                                      | ✅ Routine-friendly (Casey persona) |
| **Anti-pattern check** | ❌ Must NOT pre-enable notifications without consent                                | Violates autonomy                   |

---

## 5. Conversion Point Messaging Audit

### Premium Feature Discovery

When a user encounters a premium-only feature:

| Element                | Recommended Copy                                                                                           | Rating Guidance               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Indicator              | Small "Premium" badge next to feature name                                                                 | ✅ Subtle, informational      |
| Tap/click behavior     | Opens info sheet explaining the feature                                                                    | ✅ Educational first          |
| Info sheet             | "This feature is part of Finance Premium. [Description of what it does.] Premium includes: [bullet list]." | ✅ Informational, no pressure |
| CTA                    | "Learn about Premium"                                                                                      | ✅ Neutral language           |
| Dismiss                | Clear close button, no "Are you sure?"                                                                     | ✅ Respect autonomy           |
| **Anti-pattern check** | ❌ Must NOT say: "Upgrade NOW to unlock!" or "You're missing out on Premium features!"                     | Urgency + FOMO                |

### Premium Page

| Element                | Recommended Copy                                                                                                                  | Rating Guidance                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Headline               | "Finance Premium"                                                                                                                 | ✅ Simple                          |
| Subhead                | "AI insights, multi-device sync, and household sharing"                                                                           | ✅ Feature-focused                 |
| Feature list           | Clear descriptions of each premium feature                                                                                        | ✅ No "unlock" language            |
| Pricing                | "$4.99/month or $39.99/year" with no hidden costs                                                                                 | ✅ Transparent                     |
| CTA                    | "Start Premium" or "Subscribe"                                                                                                    | ✅ Neutral                         |
| Free comparison        | "Your free plan includes everything you use today. Premium adds:"                                                                 | ✅ Reassures that free is complete |
| **Anti-pattern check** | ❌ Must NOT say: "You're on the FREE plan" (implies inferiority) or "Upgrade to the FULL experience" (implies free is incomplete) | Devalues free tier                 |

### Conversion Timing

| Timing                 | Approach                                                                           | Rating Guidance                          |
| ---------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| First session          | ❌ Never mention premium in first session                                          | ✅ Let them experience the app first     |
| First week             | Only show premium badges on premium features                                       | ✅ Discovery, not sales                  |
| After positive moment  | "Finance Premium includes AI categorization that could save you time. Learn more?" | ✅ Context-appropriate, not interruptive |
| Settings page          | Premium section always accessible                                                  | ✅ User-initiated exploration            |
| **Anti-pattern check** | ❌ Must NOT show premium pop-ups, interstitials, or full-screen offers             | Dark pattern — manipulative              |

---

## 6. Day 1–7 Experience Map

### Day 1: First Launch

| Touchpoint            | Copy/Experience                                       | Assessment                                                                   |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| App open              | Welcome screen                                        | ✅ if per §2 recommendations                                                 |
| Onboarding            | Path A or B                                           | ✅                                                                           |
| Dashboard             | Personalized (if Path B) or default (Path A)          | ✅                                                                           |
| Post-onboarding tasks | Dismissible task cards: "Add your first account" etc. | ⚠️ Verify cards are dismissible with one tap, don't reappear after dismissal |
| Privacy               | "All data stays on this device, encrypted" visible    | ✅                                                                           |

### Day 2–3: Building the Habit

| Touchpoint                   | Copy/Experience                     | Assessment   |
| ---------------------------- | ----------------------------------- | ------------ |
| Quick entry                  | 3-tap flow with haptic confirmation | ✅           |
| Budget view                  | Shows allocated vs. spent           | ✅           |
| Daily snapshot (if opted in) | Factual summary of yesterday        | ✅           |
| Empty report                 | "Not enough data yet"               | ✅ if per §3 |

### Day 4–5: Exploration

| Touchpoint                | Copy/Experience                      | Assessment                                   |
| ------------------------- | ------------------------------------ | -------------------------------------------- |
| Reports populate          | Spending patterns appear             | ✅                                           |
| Expertise tier discovery  | User may switch tier                 | ✅ — ensure switching is easy and guilt-free |
| Premium feature encounter | "Premium" badge, informational sheet | ✅ if per §5                                 |
| Goal creation             | Optional, encouraging                | ✅                                           |

### Day 6–7: Retention Signals

| Touchpoint                   | Copy/Experience                             | Assessment   |
| ---------------------------- | ------------------------------------------- | ------------ |
| Weekly insight (if opted in) | "Your week in review"                       | ✅ if per §4 |
| Streak display               | "5-day streak!" — positive only             | ✅           |
| Budget check                 | Progress bars, neutral over-budget language | ✅           |
| No action needed             | App is silent — no unsolicited prompts      | ✅           |

---

## 7. Findings & Recommendations

### Summary of Findings

| Area               | Overall Rating  | Key Issues                                                     |
| ------------------ | --------------- | -------------------------------------------------------------- |
| Onboarding flow    | ✅ Strong       | Minor: headline could be more benefit-focused                  |
| Empty states       | ⚠️ Needs review | Ensure implementation matches these recommendations            |
| Notifications      | ⚠️ Needs review | Verify broken-streak silence is implemented, not just designed |
| Conversion points  | ⚠️ Needs review | Verify no interstitials or pop-ups exist in current build      |
| Day 1–7 experience | ✅ Strong       | Good design intent; verify execution matches spec              |

### Critical Recommendations

1. **No broken-streak notifications** — Verify this is enforced in code, not just documented. The Casey persona will abandon the app if guilt-tripped about missing days.

2. **Empty state copy must be implemented** — Check that actual in-app strings match the recommended copy in §3. Default framework text ("No items") is not acceptable.

3. **Premium conversion timing** — Verify premium is never mentioned in the first session. Day 1 should be entirely about the free experience.

4. **Notification opt-in** — Verify notifications are opt-in only, never pre-enabled. First notification prompt should include "You can change this anytime."

5. **"Welcome back" over "You were gone"** — Return-after-absence messaging must be warm and non-guilt-inducing across all platforms.

### Engineering Action Items

| Action                                                      | Priority  | Reference |
| ----------------------------------------------------------- | --------- | --------- |
| Audit all notification strings for judgment language        | 🔴 High   | §4        |
| Verify broken-streak notification is suppressed             | 🔴 High   | §4        |
| Review empty state strings against recommendations          | 🔴 High   | §3        |
| Verify premium timing (no first-session mentions)           | 🟡 Medium | §5        |
| Verify notification opt-in is the default                   | 🔴 High   | §4        |
| Add "You can change this anytime" to all preference prompts | 🟡 Medium | §4        |

---

## 8. Revised Copy Recommendations

### Strings to Change (If Not Already Aligned)

| Location              | Current (Possible Default)     | Recommended                                                                   | Priority    |
| --------------------- | ------------------------------ | ----------------------------------------------------------------------------- | ----------- |
| Welcome headline      | "Welcome to Finance"           | "See your money clearly"                                                      | 🟡 Medium   |
| Empty transactions    | "No items"                     | "No transactions yet. Add your first one — it takes 3 taps."                  | 🔴 High     |
| Empty budgets         | "No budgets"                   | "No spending plan yet. Set a plan for any category — adjust as life happens." | 🔴 High     |
| Over budget indicator | "Overspent" (if used anywhere) | "Over plan" or "Used 110% of your plan"                                       | 🔴 High     |
| Streak break          | Any notification               | Remove entirely — no notification on streak break                             | 🔴 Critical |
| Return after absence  | Any guilt copy                 | "Welcome back! Your data is right where you left it."                         | 🔴 High     |
| Premium prompt        | "Upgrade" / "Unlock"           | "Learn about Premium" / "Premium includes..."                                 | 🟡 Medium   |

### New Strings to Add

| Location                  | Copy                                                            | Purpose                                |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| Each onboarding step      | "You can change this anytime in Settings."                      | Reduces commitment anxiety             |
| First transaction saved   | "Your first transaction is saved, right here on your device."   | Privacy reassurance at moment of trust |
| Settings → Notifications  | "All notifications are optional. Adjust or turn off anytime."   | Reinforces autonomy                    |
| Settings → Expertise Tier | "Switch between comfort levels whenever you want. No judgment." | Reduces fear of "choosing wrong"       |

---

## References

- [Onboarding Flow Architecture](../architecture/onboarding-flow.md) — Onboarding design spec
- [Brand Voice Guide](brand-voice-guide.md) — Tone, vocabulary, do/don't examples
- [UX Principles](../design/ux-principles.md) — Non-judgmental, accessibility-first principles
- [Product Identity § 5–6](../design/product-identity.md) — Onboarding philosophy, daily habit loop
- [Personas](../design/personas.md) — Casey persona for notification sensitivity
- [Privacy Marketing Messaging](privacy-marketing-messaging.md) — Privacy copy accuracy
