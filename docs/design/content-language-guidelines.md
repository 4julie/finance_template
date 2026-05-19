# Content Language Guidelines — Non-Judgmental Financial Copy

> **Status:** PROPOSED — Pending human review
> **Issue:** #1768
> **Priority:** P1
> **Last Updated:** 2026-05-19
> **Applies to:** All platforms (iOS, Android, Web, Windows), notifications, reports, onboarding

---

## Table of Contents

1. [Purpose](#purpose)
2. [Core Principles](#core-principles)
3. [Words and Phrases to Avoid](#words-and-phrases-to-avoid)
4. [Recommended Alternatives](#recommended-alternatives)
5. [Patterns by Context](#patterns-by-context)
   - [Budget Overspend Warnings](#budget-overspend-warnings)
   - [Goal Progress](#goal-progress)
   - [Account Balance Notifications](#account-balance-notifications)
   - [Empty States and Onboarding](#empty-states-and-onboarding)
   - [Error Messages and System Alerts](#error-messages-and-system-alerts)
   - [Financial Reports and Summaries](#financial-reports-and-summaries)
   - [Bills and Recurring Payments](#bills-and-recurring-payments)
6. [Notification and Push Alert Guidelines](#notification-and-push-alert-guidelines)
7. [Expertise Tier Adaptations](#expertise-tier-adaptations)
8. [Accessibility Considerations](#accessibility-considerations)
9. [Audit Findings](#audit-findings)
10. [Content Review Checklist](#content-review-checklist)
11. [References](#references)

---

## Purpose

Many people experience financial anxiety. The language we use in the Finance app directly affects whether users engage with their finances or avoid them. **Every string, notification, and label should make users feel informed and empowered — never ashamed, panicked, or judged.**

This guide establishes a cross-platform writing standard that:

- Bans shame-based wording from all user-facing copy
- Pairs every warning state with information and a next action — never panic language
- Covers all content surfaces: notifications, empty states, onboarding, reports, alerts, and error messages
- Aligns with [UX Principle 3: Non-Judgmental Finance](ux-principles.md#principle-3-non-judgmental-finance) and [Persona 4: Casey](personas.md)

---

## Core Principles

### 1. Observe, Don't Judge

The app presents facts about the user's financial state. It never evaluates the user's choices, habits, or character.

- ✅ _"You've used 110% of your Food plan"_
- ❌ ~~"You overspent on Food!"~~

### 2. Inform, Then Offer an Action

Warning states always pair a factual observation with a constructive next step. Never present a problem without a path forward.

- ✅ _"Your Dining plan is fully used. Want to adjust your plan or move funds?"_
- ❌ ~~"Dining budget exceeded!"~~

### 3. Celebrate Progress, Not Perfection

Acknowledge effort and movement, not just hitting targets. When users are behind, focus on what they've accomplished and what they can do next.

- ✅ _"You've saved $2,300 toward your goal — 46% there!"_
- ❌ ~~"You're behind on your savings goal"~~

### 4. Use Neutral Visual Indicators

Color changes, icons, and visual emphasis should inform — not alarm. Avoid red-only danger states. Use semantic tokens that adapt across themes and that pair with text and icons, never relying on color alone (see [Accessibility Patterns](accessibility-patterns.md)).

### 5. Respect User Autonomy

The app never tells users what they "should" do. It offers information and options. Users make their own decisions.

- ✅ _"Here are your options:"_
- ❌ ~~"You should cut back on dining out"~~

---

## Words and Phrases to Avoid

The following words and phrases carry shame, panic, or judgment when used in financial contexts. **Do not use them in user-facing copy.** Some are acceptable in technical/developer contexts (error logs, API responses) but must not appear in the UI.

### Shame-Based Language

| Avoid                              | Why                                | Use Instead                                |
| ---------------------------------- | ---------------------------------- | ------------------------------------------ |
| "overspent" / "overspending"       | Implies personal failure           | "used more than planned" / "exceeded plan" |
| "wasted"                           | Assigns moral judgment to spending | "spent" / "used"                           |
| "bad" (spending habits, decisions) | Evaluative judgment                | Remove — present facts only                |
| "irresponsible"                    | Character attack                   | Never appropriate in any context           |
| "guilty" / "guilt-free"            | Associates emotions with spending  | Remove entirely                            |
| "splurge" / "splurged"             | Implies recklessness               | "unplanned spending" or just "spent"       |
| "blew through" / "burned through"  | Implies lack of control            | "used" / "spent"                           |

### Panic and Alarm Language

| Avoid                           | Why                                            | Use Instead                              |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------- |
| "DANGER" / "CRITICAL"           | Creates panic, not clarity                     | "needs attention" / "action needed"      |
| "WARNING" (as a label)          | Triggers anxiety                               | "heads up" / "notice"                    |
| "ALERT" (in all caps)           | Feels like an alarm                            | Use sentence case: "Alert" or rephrase   |
| "emergency" (for budget states) | Reserves emotional weight for true emergencies | "needs attention"                        |
| "in the red"                    | Stigmatizing idiom                             | "over plan" / "past the planned amount"  |
| "deficit"                       | Clinical and alarming                          | "difference" / "gap"                     |
| "negative balance"              | Anxiety-inducing framing                       | "balance below zero" or state the amount |

### Judgmental Framing

| Avoid                             | Why                                 | Use Instead                              |
| --------------------------------- | ----------------------------------- | ---------------------------------------- |
| "failed" (for user goals/budgets) | Implies personal failure            | "not yet reached" / "still in progress"  |
| "violated" (budget limits)        | Legal/punitive connotation          | "went past" / "exceeded"                 |
| "behind" (on goals/schedules)     | Implies falling short               | "in progress" / state the factual gap    |
| "overdue" (for goals)             | Punitive framing for personal goals | "past target date" / "extended timeline" |
| "loss" / "lost" (for spending)    | Treats all spending as loss         | "spent" / "used"                         |
| "punishment" / "penalty"          | Never appropriate                   | Never appropriate                        |

### Important Nuance — Context Matters

Some words are acceptable in specific, factual contexts:

- **"Overdue"** — Acceptable for bills with external deadlines (utility bills, rent) because there are real-world consequences. Still pair with an action: _"Electric bill is past its due date. Mark as paid?"_
- **"Exceeded"** — Acceptable when paired with a next action and used without emotional emphasis: _"This category exceeded the planned amount. Adjust your plan?"_
- **"Negative"** — Acceptable as a technical CSS/design token name (`--semantic-status-negative`) but should not appear in user-facing text. Use the factual amount instead.
- **"Warning"** — Acceptable as a technical severity level (CSS class, log level) but should not be the user-facing label.

---

## Recommended Alternatives

### Vocabulary Shift

| Instead of…                  | Write…                                            |
| ---------------------------- | ------------------------------------------------- |
| "You overspent by $50"       | "You've used $50 more than planned"               |
| "Budget exceeded"            | "Plan fully used" / "$X over your planned amount" |
| "You failed to save"         | "Your savings are still in progress"              |
| "Spending warning"           | "Spending update"                                 |
| "Danger zone"                | "Nearing your plan limit"                         |
| "You're behind on your goal" | "You've saved $X so far — $Y to go"               |
| "Deficit of $200"            | "$200 difference from plan"                       |
| "Negative balance"           | "Balance: −$150" (state the number)               |
| "Overdue goal"               | "Past target date"                                |
| "No progress"                | "Ready to get started"                            |
| "You should save more"       | "Would you like to adjust your savings target?"   |

### Tone Patterns

**Factual + Forward-looking:**

> _"Your Dining category has used 115% of the planned amount. You can adjust your plan, or the extra will roll into next month."_

**Encouraging without being patronizing:**

> _"You've saved $2,300 — almost halfway to your vacation fund."_

**Direct and helpful when things need attention:**

> _"3 bills are coming up this week, totaling $340."_

---

## Patterns by Context

### Budget Overspend Warnings

Budgets going over plan is normal and common. The language should normalize this, present the facts, and offer actionable options.

#### ✅ Good Examples

| Scenario           | Copy                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| At 75% of budget   | _"You've used 75% of your Groceries plan with 10 days left."_                       |
| At 90% of budget   | _"Almost there — 90% of your Dining plan is used."_                                 |
| At 100% of budget  | _"Your Transport plan is fully used for this period."_                              |
| Over budget by $50 | _"You've used $50 more than your Groceries plan. Adjust your plan?"_                |
| Significantly over | _"Your Dining spending is $200 past the planned amount. Want to review or adjust?"_ |

#### ❌ Bad Examples

| Copy                                       | Problem                               |
| ------------------------------------------ | ------------------------------------- |
| _"⚠️ WARNING: Groceries budget EXCEEDED!"_ | Panic language, all-caps alarm        |
| _"You overspent on dining again"_          | "Again" implies pattern of failure    |
| _"Budget violated — $50 over limit"_       | "Violated" and "limit" are punitive   |
| _"You're in the red on Transport"_         | Stigmatizing idiom                    |
| _"DANGER: Spending out of control"_        | Character judgment disguised as alert |

#### Screen Reader Guidance

For budget progress indicators, the accessible label should state the factual percentage and amount, not a judgment:

- ✅ `aria-label="Groceries: 85% of plan used, $30 remaining"`
- ❌ `aria-label="Groceries: WARNING — almost exceeded"`

---

### Goal Progress

Goals are personal aspirations. Users who are "behind" on goals are already aware — they don't need the app to highlight it negatively. Focus on what's been accomplished and what comes next.

#### ✅ Good Examples

| Scenario             | Copy                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Early progress (15%) | _"You've saved $750 — off to a great start!"_                                                       |
| Midway (50%)         | _"Halfway there! $5,000 saved toward your house fund."_                                             |
| Behind schedule      | _"$2,300 saved so far. At the current pace, you'll reach your goal by August 2027."_                |
| Past target date     | _"Your target date has passed — you've saved $8,000 of $10,000. Keep going or adjust your target?"_ |
| Goal reached         | _"Goal reached! 🎉 You saved $10,000 for your emergency fund."_                                     |
| No contributions yet | _"Ready to start saving? Add your first contribution anytime."_                                     |

#### ❌ Bad Examples

| Copy                                       | Problem                                               |
| ------------------------------------------ | ----------------------------------------------------- |
| _"Past due"_                               | Goals aren't debts — "due" is punitive                |
| _"You're behind on your savings"_          | Implies personal shortcoming                          |
| _"Failed to reach goal by deadline"_       | "Failed" and "deadline" are punitive                  |
| _"Only 15% saved — you need to save more"_ | "Only" diminishes progress; "need to" is prescriptive |
| _"Goal overdue"_                           | Treats personal goals like obligations                |

---

### Account Balance Notifications

Balance notifications should be informative without creating anxiety, especially for low balances.

#### ✅ Good Examples

| Scenario          | Copy                                                            |
| ----------------- | --------------------------------------------------------------- |
| Low balance       | _"Your checking account balance is $45.20."_                    |
| Balance update    | _"Your savings account is at $3,200 — up $150 from last week."_ |
| Negative balance  | _"Your credit card balance is −$1,200."_                        |
| Balance milestone | _"Your emergency fund just passed $5,000!"_                     |

#### ❌ Bad Examples

| Copy                                                 | Problem                     |
| ---------------------------------------------------- | --------------------------- |
| _"⚠️ LOW BALANCE WARNING"_                           | Panic framing               |
| _"Your account is dangerously low"_                  | "Dangerously" creates fear  |
| _"Insufficient funds detected"_                      | Clinical/institutional tone |
| _"Negative balance alert — take action immediately"_ | Urgency pressure            |

---

### Empty States and Onboarding

Empty states are a user's first encounter with a feature. They should feel inviting and encouraging, never like the user is "missing" something or "behind."

#### ✅ Good Examples

| Context         | Copy                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| No accounts     | _"Add your first account to start tracking your finances."_                                                                           |
| No transactions | _"Record your income and expenses to see where your money goes."_                                                                     |
| No budgets      | _"Create your first budget to start tracking spending by category."_                                                                  |
| No goals        | _"Set a savings goal to track progress toward something important."_                                                                  |
| Dashboard empty | _"Add accounts, budgets, or transactions to see your financial summary here."_                                                        |
| Welcome screen  | _"Take control of your finances. Track accounts, record transactions, set budgets, and reach your savings goals — all in one place."_ |

**Note:** The current web app empty states already follow these guidelines well. See [Audit Findings](#audit-findings) for the few exceptions.

#### ❌ Bad Examples

| Copy                                                        | Problem                 |
| ----------------------------------------------------------- | ----------------------- |
| _"You haven't set up anything yet"_                         | Implies user is behind  |
| _"No data — your finances are untracked"_                   | Anxiety-inducing        |
| _"Warning: No budget set. You're spending without limits."_ | Judgmental and alarming |
| _"You should set up a budget before tracking spending"_     | Prescriptive            |

---

### Error Messages and System Alerts

Error messages are about the system, not the user. The user didn't fail — the app encountered a problem.

#### ✅ Good Examples

| Scenario          | Copy                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Generic error     | _"Something went wrong. Try again, or head back to your dashboard."_                                |
| Network error     | _"You're offline. Your data is safe — changes are saved locally and will sync when you reconnect."_ |
| Save failure      | _"We couldn't save that change. Try again?"_                                                        |
| Page not found    | _"The page you're looking for doesn't exist or has been moved."_                                    |
| Data load failure | _"We couldn't load your budgets. Retry?"_                                                           |

**Note:** The current web app error states (ErrorBoundary, OfflineFallbackPage, NotFoundPage) already follow these guidelines excellently.

#### ❌ Bad Examples

| Copy                                      | Problem                   |
| ----------------------------------------- | ------------------------- |
| _"ERROR: Operation failed"_               | Technical and alarming    |
| _"Invalid input — please fix your entry"_ | Blames the user           |
| _"Fatal error occurred"_                  | "Fatal" creates fear      |
| _"Your request was rejected"_             | "Rejected" feels personal |

---

### Financial Reports and Summaries

Reports should present data neutrally. Trends are observations, not evaluations.

#### ✅ Good Examples

| Scenario          | Copy                                                       |
| ----------------- | ---------------------------------------------------------- |
| Spending up       | _"Dining spending is up 15% from last month."_             |
| Spending down     | _"Your grocery spending decreased 10% this month."_        |
| Budget comparison | _"3 of 5 categories came in under plan. 2 went over."_     |
| Monthly summary   | _"This month: $3,200 spent, $4,500 earned, $1,300 saved."_ |
| Savings rate      | _"Savings rate: 28%"_                                      |
| Cash flow         | _"Net cash flow: +$850"_                                   |

#### ❌ Bad Examples

| Copy                                            | Problem                           |
| ----------------------------------------------- | --------------------------------- |
| _"Your spending is out of control"_             | Judgment                          |
| _"Bad month — you saved less than usual"_       | "Bad" is evaluative               |
| _"You wasted $200 on dining"_                   | "Wasted" is judgmental            |
| _"Failed to stay under budget in 3 categories"_ | "Failed" implies personal failure |

---

### Bills and Recurring Payments

Bills have real external deadlines with real consequences, so factual urgency is appropriate. However, the tone should still be informative and action-oriented rather than panic-inducing.

#### ✅ Good Examples

| Scenario           | Copy                                                |
| ------------------ | --------------------------------------------------- |
| Bill due soon      | _"Electric bill is due in 3 days."_                 |
| Bill due today     | _"Internet bill is due today."_                     |
| Bill past due date | _"Electric bill was due 2 days ago. Mark as paid?"_ |
| Multiple upcoming  | _"3 bills coming up this week, totaling $340."_     |

#### ❌ Bad Examples

| Copy                                            | Problem                            |
| ----------------------------------------------- | ---------------------------------- |
| _"OVERDUE! Electric bill — pay immediately!"_   | Panic and urgency pressure         |
| _"You missed your electric bill payment"_       | "Missed" implies carelessness      |
| _"Late payment — this will affect your credit"_ | Assumes consequences; creates fear |

#### Note on "Overdue"

"Overdue" is technically acceptable for bills because external due dates have real consequences. However, we prefer more specific, action-oriented phrasing when possible:

- Acceptable: _"Overdue"_ (as a status label)
- Preferred: _"Past due date"_ or _"Due 3 days ago — mark as paid?"_

---

## Notification and Push Alert Guidelines

Notifications interrupt the user's day. They must earn that interruption by being useful, not anxiety-inducing.

### Rules for All Notifications

1. **Never lead with alarm language.** Start with the factual state, then offer context.
2. **Always opt-in.** No notification should arrive without the user having enabled it.
3. **Time appropriately.** Routine notifications should arrive at consistent, predictable times.
4. **Keep it brief.** Notifications are glanceable — one key fact, one optional action.
5. **Never shame.** A notification should never make the user feel bad about opening it.

### Notification Templates

#### Daily Snapshot (Opt-in)

- ✅ _"Yesterday you spent $47. Your week is on track. ✅"_
- ✅ _"You spent $120 yesterday. Your week total is $380 of $500 planned."_
- ❌ ~~"Warning: Yesterday's spending was high at $120"~~

#### Weekly Summary (Opt-in)

- ✅ _"This week: $312 spent. Biggest category: Dining ($89). $43 under your plan."_
- ✅ _"Week in review: $450 spent across 12 transactions. $50 over plan — want to adjust?"_
- ❌ ~~"You went over budget this week by $50. Be more careful next week."~~

#### Budget Threshold (Opt-in)

- ✅ _"Heads up: Groceries is at 80% of your monthly plan."_
- ✅ _"Your Dining plan is fully used for this month."_
- ❌ ~~"⚠️ Budget WARNING: Dining exceeded!"~~

#### Bill Reminders

- ✅ _"Electric bill ($120) is due tomorrow."_
- ✅ _"3 bills due this week, totaling $340."_
- ❌ ~~"Don't forget to pay your electric bill! Missing it could hurt your credit."~~

#### Goal Milestones

- ✅ _"Nice! Your vacation fund just passed $3,000. 🎉"_
- ✅ _"You're halfway to your emergency fund goal!"_
- ❌ ~~"You still haven't reached your savings goal."~~

---

## Expertise Tier Adaptations

The [Product Identity expertise tier system](product-identity.md#3-expertise-tier-system) affects how copy is presented, but the non-judgmental principle applies equally at all tiers.

| Tier               | Language Style              | Budget Over Example                                                                |
| ------------------ | --------------------------- | ---------------------------------------------------------------------------------- |
| 🌱 Getting Started | Simple, guided, encouraging | _"You've spent a bit more than planned on Dining. That's normal! Want to adjust?"_ |
| 📊 Comfortable     | Clear, concise, factual     | _"Dining is $50 over plan. Adjust budget?"_                                        |
| 🧠 Advanced        | Data-dense, direct          | _"Dining: 115% ($575/$500). Rebalance?"_                                           |

All three tiers:

- Present facts without judgment
- Offer a next action
- Never use shame-based vocabulary

---

## Accessibility Considerations

Non-judgmental language and accessibility are deeply connected. Users who rely on assistive technology hear every word read aloud — and emotional load is amplified when content is spoken.

### Screen Reader Copy

- **Avoid emotional punctuation** in text that will be read aloud. Multiple exclamation marks (`!!!`) or alarm words are spoken with extra emphasis by screen readers.
- **Use descriptive, factual `aria-label` values.** For example: `aria-label="Groceries budget: 85% used, $30 remaining"` — not `aria-label="Groceries: WARNING"`.
- **Budget status tones** in CSS class names (`positive`, `warning`, `negative`) are invisible to screen readers but their associated colors are not. Always pair with text that conveys the same meaning.

### Cognitive Accessibility

The [Cognitive Accessibility Mode](cognitive-accessibility.md) amplifies the importance of these guidelines:

- **Simpler language** in cognitive mode — shorter sentences, familiar words
- **Fewer numbers** — show one key metric instead of three
- **Gentler framing** — _"Everything looks good"_ rather than detailed breakdowns
- **No time pressure** — avoid countdown language like "only 3 days left!"

### Motion and Visual Indicators

- Never use flashing or pulsing animations to draw attention to overspend states.
- Budget progress rings and bars use semantic color tokens that adapt across themes (light, dark, OLED, high-contrast) — but never rely on color alone to convey status.
- See [Accessibility Patterns](accessibility-patterns.md) for full visual indicator requirements.

---

## Audit Findings

An audit of `apps/web/src/` identified the following user-facing strings that could be improved. Items are categorized by severity.

### High Priority — Should Fix

| File                       | Line(s)  | Current Copy                             | Issue                                                                                                                   | Recommended Fix                                                                                |
| -------------------------- | -------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pages/GoalsPage.tsx`      | 323      | `'Past due'`                             | Punitive framing for personal goals. Goals are not debts.                                                               | `'Past target date'`                                                                           |
| `pages/GoalDetailPage.tsx` | 161, 224 | `'Past due'` / `'Due today'`             | Same punitive framing. "Due" implies obligation.                                                                        | `'Past target date'` / `'Target date is today'`                                                |
| `pages/GoalsPage.tsx`      | 183–184  | Goals <25% get `statusTone = 'negative'` | Labels early-stage goals as "negative," which maps to alarm colors. A goal at 20% progress isn't negative — it's early. | Use `'neutral'` or `'info'` tone for <25%; reserve `'warning'` for past-target-date goals only |

### Medium Priority — Consider Fixing

| File                         | Line(s) | Current Copy                                 | Issue                                                                           | Recommended Fix                                                             |
| ---------------------------- | ------- | -------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `pages/BillsPage.tsx`        | 89–90   | `'1 day overdue'` / `'X days overdue'`       | While "overdue" is acceptable for bills, action-oriented phrasing is preferred. | `'Due 1 day ago'` / `'Due X days ago — mark as paid?'`                      |
| `pages/BudgetsPage.tsx`      | 354     | `'over'` (as in "$50 over")                  | Brief but lacks a next action.                                                  | `'over plan'` or `'past plan — adjust?'`                                    |
| `pages/BudgetDetailPage.tsx` | 262     | `'over budget'`                              | Slightly more judgmental than necessary.                                        | `'over plan'` or `'past planned amount'`                                    |
| `pages/DashboardPage.tsx`    | 146     | Budget >90% labeled `'negative'` status tone | Approaching 90% isn't inherently negative — it depends on timing in the period. | Consider `'warning'` (informational) instead of `'negative'` (alarm) at 90% |

### Low Priority — Acceptable, Could Improve

| File                       | Line(s) | Current Copy                        | Note                                                                                               |
| -------------------------- | ------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pages/BillsPage.tsx`      | 36      | `'OVERDUE'` status label            | Acceptable for bills. Could soften to `'Past Due'` for consistency with language guidelines.       |
| `pages/GoalDetailPage.tsx` | 161     | `'Due today'` for goal target dates | Goals don't have "due" dates — they have "target" dates. Could change to `'Target date is today'`. |

### Positive Findings — Already Compliant ✅

The following areas already follow non-judgmental language patterns well:

- **Empty states** (`EntityEmptyStates.tsx`, inline empty states) — Inviting, action-oriented
- **Error boundary** (`ErrorBoundary.tsx`) — Blame-free, offers clear recovery path
- **Offline fallback** (`OfflineFallbackPage.tsx`) — Reassuring ("Your data is safe"), action-oriented
- **Not found page** (`NotFoundPage.tsx`) — Neutral, helpful
- **Onboarding welcome** (`EntityEmptyStates.tsx` WelcomeScreen) — Encouraging without being prescriptive
- **Goal reached celebration** — `'Goal reached! 🎉'` — Positive reinforcement
- **Budget "left" framing** — `'$X left'` is neutral and informative
- **Insights page** — Factual comparisons ("↑ 15% vs last month") without judgment

---

## Content Review Checklist

Use this checklist when reviewing any user-facing copy across all platforms.

### Before Shipping Any String

- [ ] **No shame words** — Does the copy avoid all words from the [Avoid list](#words-and-phrases-to-avoid)?
- [ ] **Facts, not judgments** — Does it state what happened without evaluating the user?
- [ ] **Action included** — Does every warning or alert include a next step the user can take?
- [ ] **No panic language** — Is the tone calm and informative, even for urgent states?
- [ ] **No prescriptive language** — Does it avoid telling users what they "should" or "need to" do?
- [ ] **Screen reader test** — Read the string aloud. Does it sound supportive or stressful?
- [ ] **Emoji check** — Are warning emojis (⚠️, 🚨, ❌) used only where truly necessary, not for budget states?

### Content Surfaces to Review

- [ ] **Notifications** — daily snapshots, weekly summaries, budget thresholds, bill reminders
- [ ] **Empty states** — first-run screens, no-data views for each entity
- [ ] **Onboarding** — welcome flow, expertise tier selection, guided setup
- [ ] **Reports** — monthly summaries, trend comparisons, category breakdowns
- [ ] **Budget UI** — progress bars, percentage labels, over-budget messaging
- [ ] **Goal UI** — progress indicators, target date messaging, milestone celebrations
- [ ] **Bill UI** — status labels, due date messaging, past-due framing
- [ ] **Error messages** — form validation, network errors, system failures
- [ ] **Confirm dialogs** — delete confirmations, data-altering actions
- [ ] **Tooltips and info popovers** — financial term explanations, contextual help

---

## References

- [UX Principles — Principle 3: Non-Judgmental Finance](ux-principles.md#principle-3-non-judgmental-finance)
- [UX Principles — Principle 7: Financial Wellness Over Financial Management](ux-principles.md#principle-7-financial-wellness-over-financial-management)
- [Personas — Casey (Accessibility-First User)](personas.md)
- [Product Identity — "Facts, Not Judgments"](product-identity.md)
- [Cognitive Accessibility Mode](cognitive-accessibility.md)
- [Accessibility Patterns](accessibility-patterns.md)
