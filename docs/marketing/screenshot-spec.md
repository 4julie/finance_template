# Screenshot Planning & Copy Overlay Spec

> **Issue:** [#836](https://github.com/jrmoulckers/finance/issues/836)
> **Status:** PROPOSED — Pending human review
> **Sprint:** Marketing Sprint 1
> **Last Updated:** 2025-07-27
> **Author:** Marketing Strategist (AI agent)
> **Related:** [Product Identity](../design/product-identity.md) · [Brand Voice Guide](brand-voice-guide.md) · [Store Metadata](../guides/store-metadata.md)

---

## Table of Contents

1. [Screenshot Strategy](#1-screenshot-strategy)
2. [Screen Sequence & Story Arc](#2-screen-sequence--story-arc)
3. [Copy Overlays Per Screen](#3-copy-overlays-per-screen)
4. [Sample Data Specification](#4-sample-data-specification)
5. [Platform Dimensions & Specs](#5-platform-dimensions--specs)
6. [Visual Design Guidelines](#6-visual-design-guidelines)
7. [Dark Mode Variants](#7-dark-mode-variants)
8. [Accessibility Showcase Screenshot](#8-accessibility-showcase-screenshot)
9. [Production Capture Checklist](#9-production-capture-checklist)

---

## 1. Screenshot Strategy

### Principles

1. **Tell a story, not list features** — Screenshots should flow like a narrative: "Here's what you see → Here's how quick it is → Here's the insight you get"
2. **Show, don't tell** — The app UI is the hero; copy overlays add context, not replace the visual
3. **6 words or fewer per overlay** — Must be readable at thumbnail size in store listings
4. **Diverse and realistic data** — Sample data uses varied names, realistic (not aspirational) amounts, and diverse categories
5. **Platform-native presentation** — Each platform's screenshots use that platform's device frames and conventions

### Screenshot Count Per Platform

| Platform         | Required | Recommended | Max |
| ---------------- | -------- | ----------- | --- |
| iOS (iPhone)     | 3        | 5–6         | 10  |
| iOS (iPad)       | 3        | 5           | 10  |
| Android (Phone)  | 4        | 5–8         | 8   |
| Android (Tablet) | 4        | 5           | 8   |
| Windows          | 2        | 4           | 10  |
| Web (OG Image)   | 1        | 1           | 1   |

**Recommendation:** 6 screenshots per mobile platform (phone), 4 per tablet, 4 for Windows.

---

## 2. Screen Sequence & Story Arc

The 6-screenshot sequence tells a complete story. Order matters — the first 2 screenshots drive 80% of conversion decisions.

| Position | Screen               | Story Beat                       | Why This Order                                                |
| -------- | -------------------- | -------------------------------- | ------------------------------------------------------------- |
| **1**    | Dashboard (overview) | "Here's what clarity looks like" | First impression — must convey the app's core value instantly |
| **2**    | Quick Entry          | "It takes 3 taps"                | Addresses the #1 objection: "I don't have time to track"      |
| **3**    | Budget View          | "Give every dollar a purpose"    | Core methodology — envelope budgeting in action               |
| **4**    | Reports / Analytics  | "See your patterns clearly"      | Insight payoff — this is what tracking earns you              |
| **5**    | Goals                | "Watch your progress grow"       | Emotional hook — savings goals with projections               |
| **6**    | Privacy / Settings   | "Your data stays yours"          | Trust builder — encryption, offline, no bank needed           |

---

## 3. Copy Overlays Per Screen

### Screenshot 1: Dashboard

**Overlay text:** "See your money at a glance"

**What's visible on screen:**

- Today's spending total (hero number)
- Weekly trend indicator ("On track this week")
- Top 3 budget categories with progress bars
- Net worth or account balance summary
- Clean, uncluttered layout with generous whitespace

**Mood:** Calm, clear, in-control

### Screenshot 2: Quick Entry

**Overlay text:** "3 taps. 30 seconds. Done."

**What's visible on screen:**

- Transaction entry sheet/modal
- Amount field with number pad
- Category suggestion chips (smart suggestions)
- Recent categories for quick selection
- Visible but optional fields (notes, tags)

**Mood:** Quick, effortless, frictionless

### Screenshot 3: Budget View

**Overlay text:** "Every dollar has a purpose"

**What's visible on screen:**

- Envelope/category budget list
- Progress bars showing spent vs. budgeted
- Color-coded status (green = under, yellow = approaching, neutral for over)
- "Available to budget" or "Remaining" summary at top
- At least one category showing realistic partial spend

**Mood:** Organized, purposeful, satisfying

### Screenshot 4: Reports

**Overlay text:** "Your spending, visualized"

**What's visible on screen:**

- Spending by category chart (pie/donut or bar)
- Month-over-month trend line
- Top categories list with amounts
- CVD-safe color palette visible in chart
- Time period selector (This Month / Last Month)

**Mood:** Insightful, revealing, data-rich-but-clear

### Screenshot 5: Goals

**Overlay text:** "Track your progress"

**What's visible on screen:**

- One or two savings goals with progress bars
- Projection text ("At this pace, you'll reach your goal by March 2028")
- Goal amount and current amount visible
- Milestone markers or progress indicators
- Positive/encouraging visual treatment

**Mood:** Motivating, forward-looking, hopeful

### Screenshot 6: Privacy / Settings

**Overlay text:** "Private by design"

**What's visible on screen:**

- Privacy section of settings OR
- A dedicated privacy card/screen showing:
  - "Data encrypted on device" with lock icon
  - "Works offline" with check icon
  - "No bank connection required" with check icon
  - "No tracking" with check icon
  - "Export your data anytime" with check icon

**Mood:** Trustworthy, transparent, empowering

---

## 4. Sample Data Specification

### Requirements

- **Realistic amounts:** Middle-of-the-road spending, not aspirational or poverty-level
- **Diverse names:** Varied payee names reflecting real-world diversity
- **Relatable categories:** Common spending categories everyone recognizes
- **Consistent story:** All screenshots should feel like they belong to the same person's financial life

### Sample Financial Profile

**Monthly income:** $4,200 (visible only if relevant to screenshot)

| Account       | Type        | Balance    |
| ------------- | ----------- | ---------- |
| Main Checking | Checking    | $2,847.33  |
| Savings       | Savings     | $8,420.00  |
| Credit Card   | Credit Card | -$1,234.56 |

### Sample Budget Categories

| Category       | Budgeted | Spent   | Status        |
| -------------- | -------- | ------- | ------------- |
| Housing        | $1,400   | $1,400  | On plan       |
| Food & Dining  | $450     | $387.24 | Under         |
| Transportation | $200     | $178.50 | Under         |
| Entertainment  | $100     | $112.00 | Slightly over |
| Health         | $75      | $45.00  | Under         |
| Shopping       | $150     | $89.99  | Under         |

### Sample Recent Transactions

| Date       | Payee               | Category       | Amount  |
| ---------- | ------------------- | -------------- | ------- |
| Today      | Morning Brew Coffee | Food & Dining  | -$4.50  |
| Today      | Metro Transit       | Transportation | -$2.75  |
| Yesterday  | Riverside Grocers   | Food & Dining  | -$67.43 |
| Yesterday  | Green Leaf Pharmacy | Health         | -$12.50 |
| 2 days ago | Sunrise Yoga Studio | Health         | -$32.50 |
| 3 days ago | Elm Street Books    | Shopping       | -$24.99 |
| 3 days ago | Luna's Thai Kitchen | Food & Dining  | -$18.75 |

### Sample Goals

| Goal           | Target  | Current | Projection         |
| -------------- | ------- | ------- | ------------------ |
| Emergency Fund | $10,000 | $8,420  | "2 months away"    |
| New Laptop     | $1,500  | $680    | "By December 2025" |

### Names & Payees — Diversity Guidelines

- Use **business names**, not personal names (avoids cultural assumptions)
- Mix chain and independent business names
- Include a mix of spending categories and price points
- Avoid aspirational luxury spending or poverty-level amounts
- No joke names or unrealistic payees

---

## 5. Platform Dimensions & Specs

### iOS

| Device            | Resolution     | Safe Area Notes                |
| ----------------- | -------------- | ------------------------------ |
| iPhone 16 Pro Max | 1320 × 2868 px | Primary phone screenshot       |
| iPhone 16 Pro     | 1206 × 2622 px | Optional — scales from Pro Max |
| iPad Pro 13"      | 2064 × 2752 px | Primary tablet screenshot      |
| iPad Air          | 1640 × 2360 px | Optional — scales from Pro     |

**Format:** PNG or JPEG, sRGB color space
**Device frames:** Use Apple device frames (official Marketing Resources or Rotato)
**Safe zone:** Keep critical content within center 80% (edges crop on some display contexts)

### Android

| Asset                   | Resolution           | Notes                                  |
| ----------------------- | -------------------- | -------------------------------------- |
| Phone screenshot        | 1080 × 1920 px (min) | 16:9 aspect ratio                      |
| Phone screenshot (tall) | 1080 × 2340 px       | 19.5:9 for modern devices              |
| Tablet screenshot       | 1200 × 1920 px       | 10" tablet                             |
| Feature Graphic         | 1024 × 500 px        | Required — displayed at top of listing |

**Format:** PNG or JPEG, max 8 MB per image
**Device frames:** Use Android device frames from Google's marketing assets

### Feature Graphic (Android)

**Dimensions:** 1024 × 500 px
**Content:** App icon + tagline + subtle UI preview
**Copy:** "See your money clearly. Keep it private."
**Design:** Clean background with brand colors, app icon prominent, optional blurred app preview

### Windows

| Asset               | Resolution     | Notes              |
| ------------------- | -------------- | ------------------ |
| Screenshot          | 1920 × 1080 px | Desktop resolution |
| Screenshot (scaled) | 2560 × 1440 px | High-DPI displays  |

**Format:** PNG, max 10 MB
**Content:** Show the multi-panel desktop layout, Windows-native chrome (title bar, Snap Layouts)

### Web (OG Image / Social)

| Asset            | Resolution    | Notes                           |
| ---------------- | ------------- | ------------------------------- |
| Open Graph image | 1200 × 630 px | For social sharing              |
| Twitter card     | 1200 × 675 px | Slightly different aspect ratio |

**Content:** App preview + tagline + URL

---

## 6. Visual Design Guidelines

### Background & Framing

| Element                   | Specification                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **Background**            | Solid or subtle gradient using brand palette — not pure white (gets lost in store UI)   |
| **Device frame**          | Platform-appropriate device frame — real devices, not generic mockups                   |
| **Copy overlay position** | Top 20% of the image (above device frame) or bottom 20%                                 |
| **Copy font**             | System font or brand font — bold weight, high contrast against background               |
| **Copy color**            | Dark text on light background OR light text on dark background — minimum 4.5:1 contrast |
| **Copy alignment**        | Centered horizontally, consistent positioning across all screenshots                    |

### Color Palette for Backgrounds

| Screenshot  | Background Suggestion                               |
| ----------- | --------------------------------------------------- |
| Dashboard   | Light neutral (warm gray) or brand primary (subtle) |
| Quick Entry | Same as Dashboard (continuity)                      |
| Budget View | Slight tint shift (still neutral family)            |
| Reports     | Same palette, maintain consistency                  |
| Goals       | Slightly warmer tone (optimistic feeling)           |
| Privacy     | Slightly cooler tone (trust, security)              |

### Typography for Overlays

- **Size:** Large enough to read at 50% thumbnail (test this!)
- **Weight:** Bold or Semi-Bold
- **Case:** Sentence case (not ALL CAPS)
- **Line height:** Generous — no cramped text
- **Max lines:** 2 lines per overlay (ideally 1)

---

## 7. Dark Mode Variants

### Required

- **iOS:** Dark mode screenshots required (Apple features them prominently)
- **Android:** Dark mode screenshots recommended (Material You dark theme)

### Dark Mode Guidelines

- Use the same sample data and screen sequence
- Ensure overlay text is still readable against dark UI + dark background
- Background color shifts to darker value of the same hue family
- Device frames should use dark device variants (Space Black, dark aluminum)

### Dark Mode-Specific Adjustments

| Element      | Light Mode       | Dark Mode                     |
| ------------ | ---------------- | ----------------------------- |
| Background   | Light neutral    | Dark neutral (not pure black) |
| Overlay text | Dark text        | Light text                    |
| Device frame | Silver/White     | Space Black/Dark              |
| Chart colors | Standard palette | Adjusted for dark contrast    |

---

## 8. Accessibility Showcase Screenshot

One additional screenshot (position 7 or as alternate) showcases accessibility features:

**Overlay text:** "Works with your brain"

**What's visible on screen:**

- Large text / Dynamic Type mode active
- Simplified view (fewer numbers, key info only)
- Expertise tier selector visible
- OR: side-by-side comparison of Getting Started vs. Advanced views

**Purpose:** Appeals to the Casey persona and demonstrates that accessibility is a first-class feature, not an afterthought

**Placement:** Consider as position 3 or 4 alternate in iOS App Store custom product pages for accessibility-focused audiences

---

## 9. Production Capture Checklist

### Before Capture

- [ ] Sample data loaded and verified (realistic amounts, diverse payees)
- [ ] App in final/release build (not debug/development mode)
- [ ] Status bar shows realistic time (10:09 AM is convention), full battery, full signal
- [ ] All notifications cleared
- [ ] Light mode AND dark mode captures planned
- [ ] Device language set to English (US) — localized versions planned separately
- [ ] Accessibility settings reset to defaults (unless capturing accessibility screenshot)

### During Capture

- [ ] Use native screenshot tools (not third-party capture apps)
- [ ] Capture at native resolution (no scaling artifacts)
- [ ] Verify each screen matches the spec above (correct data, correct state)
- [ ] Capture both portrait and landscape where applicable (iPad, Windows)
- [ ] Take multiple captures of each screen (pick the best framing later)

### After Capture

- [ ] Apply device frames using approved tool (Rotato, Screenshots.pro, or platform marketing assets)
- [ ] Add copy overlays per spec (Section 3)
- [ ] Verify overlay text readability at 50% size
- [ ] Check all text for typos and brand voice compliance
- [ ] Export at correct dimensions per platform (Section 5)
- [ ] Name files following convention: `{platform}-{position}-{screen}-{mode}.png`
  - Example: `ios-01-dashboard-light.png`, `android-03-budget-dark.png`
- [ ] Create composite images for feature graphic (Android) and OG images (Web)

### Quality Check

- [ ] All screenshots feel like they belong to the same person's financial life
- [ ] Sample data is consistent across screenshots (same account balances, budget amounts)
- [ ] No debug elements, developer tools, or test data visible
- [ ] No PII or real financial data visible
- [ ] Color contrast meets accessibility standards in overlays
- [ ] File sizes within platform limits

---

## References

- [Product Identity](../design/product-identity.md) — Platform-native differentiators, design inspiration
- [Brand Voice Guide](brand-voice-guide.md) — Copy overlay tone and vocabulary
- [UX Principles](../design/ux-principles.md) — Accessibility requirements, design language
- [Personas](../design/personas.md) — Target users for screenshot scenarios
- Apple [App Store Screenshot Specs](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications)
- Google [Play Store Graphic Assets](https://support.google.com/googleplay/android-developer/answer/9866151)
