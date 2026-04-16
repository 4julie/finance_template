# Chart Component Specifications — Finance

> **Status:** PROPOSED — Pending human review
> **Issue:** Financial Data Visualization Enhancement
> **Priority:** P2
> **Last Updated:** 2025-07-15
> **Platforms:** Web (React/PWA) · iOS (SwiftUI) · Android (Compose) · Windows (WinUI/XAML)

---

## Table of Contents

1. [Overview](#overview)
2. [Spending Trends Line Chart](#spending-trends-line-chart)
3. [Budget Progress Bar/Donut](#budget-progress-bardonut)
4. [Category Breakdown Pie Chart](#category-breakdown-pie-chart)
5. [Goal Progress Indicator](#goal-progress-indicator)
6. [Responsive Layout System](#responsive-layout-system)
7. [Animation Patterns](#animation-patterns)
8. [Color Palette Reference](#color-palette-reference)
9. [Token Binding Reference](#token-binding-reference)
10. [Accessibility Contract](#accessibility-contract)

---

## Overview

This document specifies the behavioral contract, token bindings, and
accessibility requirements for each chart component in the Finance app.
Platform engineers consume these specs to build native implementations —
there are no shared UI components.

### Design Principles for Charts

1. **Clarity over decoration** — every visual element must convey data
2. **Accessible by default** — keyboard, screen reader, reduced motion
3. **Color-blind safe** — IBM CVD-safe palette, never color alone
4. **Responsive** — adapts to mobile through widescreen
5. **Non-judgmental** — factual presentation, no alarm/shame language
6. **Locale-aware** — currency, number, and date formatting respect locale

---

## Spending Trends Line Chart

### Purpose

Shows how spending changes over time. Answers: "How has my spending changed?"

### Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│  Spending Trends                                            │
│  ─────────────────                                          │
│                                                             │
│  $2K ┤                                                      │
│      │                                    ╭──╮              │
│  $1K ┤          ╭──────╮    ╭──╮       ╭──╯  ╰──╮          │
│      │    ╭──╮╭─╯      ╰────╯  ╰───╮╭─╯        ╰──╮       │
│  $0  ┤────╯  ╰╯                     ╰╯              ╰───── │
│      ├──────┬──────┬──────┬──────┬──────┬──────┬──────┤     │
│      Jan   Feb    Mar    Apr    May    Jun    Jul            │
│                                                             │
│  Legend: ── Income (solid)  ┄┄ Expenses (dashed)            │
│                                                             │
│  [ View as table ]                                          │
└─────────────────────────────────────────────────────────────┘
```

### Spec

| Property               | Value                      | Token                                      |
| ---------------------- | -------------------------- | ------------------------------------------ |
| Container height       | 320px (default)            | `chart.container.defaultHeight`            |
| Container min-height   | 240px                      | `chart.container.minHeight`                |
| Container padding      | 16px                       | `chart.container.padding`                  |
| Line stroke width      | 2px                        | `chart.line.strokeWidth`                   |
| Data point radius      | 4px (6px on focus)         | `chart.line.dotRadius`, `.dotRadiusActive` |
| Axis label color       | secondary text             | `chart.axis.labelColor`                    |
| Grid line color        | default border             | `chart.axis.gridColor`                     |
| Series 1 (Income)      | Blue (#648FFF)             | `chart.series.1`                           |
| Series 2 (Expenses)    | Orange (#FE6100)           | `chart.series.4`                           |
| Line pattern: Income   | Solid                      | —                                          |
| Line pattern: Expenses | Dashed (6px dash, 4px gap) | —                                          |
| Tooltip background     | Elevated surface           | `chart.tooltip.background`                 |
| Tooltip shadow         | Medium elevation           | `chart.tooltip.shadow`                     |

### Behavioral Contract

| Behavior               | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| Data points            | 3–12 points (monthly). Less than 3 → show bar chart      |
| Multi-series           | Max 4 overlaid series. Each with distinct stroke pattern |
| Hover/tap              | Show tooltip with exact value + date                     |
| Keyboard navigation    | Arrow Left/Right between points, Enter for tooltip       |
| Empty state            | "Not enough data for trends" + CTA                       |
| Loading state          | Skeleton with shimmer (respects reduced-motion)          |
| Data update transition | 400ms crossfade (instant if reduced-motion)              |
| Y-axis                 | Auto-scaled with locale-formatted currency               |
| X-axis                 | Time labels, abbreviated months                          |

### Accessibility

| Requirement    | Implementation                                        |
| -------------- | ----------------------------------------------------- |
| Container role | `role="figure"` + `aria-roledescription="line chart"` |
| Description    | `buildChartDescription()` output                      |
| Data points    | `role="listitem"` + `aria-label="Jan: $1,200 income"` |
| Keyboard       | Arrow keys, Home/End, Enter/Space, Escape             |
| Screen reader  | Full text description in `.sr-only` element           |
| Data table alt | "View as table" toggle below chart                    |
| Reduced motion | Line draws instantly, no transition                   |
| Color-blind    | Distinct stroke patterns (solid, dashed, dotted)      |

---

## Budget Progress Bar/Donut

### Purpose

Shows budget consumption. Answers: "How much of my budget have I used?"

### Anatomy: Progress Bar

```
┌─────────────────────────────────────────────────────────────┐
│  Food Budget                                                │
│                                                             │
│  ████████████████████░░░░░░░  75% used                      │
│  $337 of $450 spent                                         │
│                                                             │
│  ✓ On track — $113 remaining this month                     │
└─────────────────────────────────────────────────────────────┘
```

### Anatomy: Donut Chart

```
┌─────────────────────────────────────────────────────────────┐
│  Monthly Budget                                             │
│                                                             │
│              ╭───────────╮                                  │
│           ╭──╯  Food     ╰──╮                               │
│         ╭─╯     ████████  ╰─╮                               │
│         │  ╭──────────╮     │                                │
│         │  │  $1,850  │     │     Legend:                    │
│         │  │  spent   │     │     ██ Food ($450)            │
│         │  ╰──────────╯     │     ██ Transport ($200)       │
│         ╰─╮  Transport╭─╯   │     ██ Rent ($800)            │
│           ╰──╮ ██████╭──╯                                   │
│              ╰───────╯                                      │
│                                                             │
│  [ View as table ]                                          │
└─────────────────────────────────────────────────────────────┘
```

### Progress Bar Spec

| Property             | Value                    | Token                                 |
| -------------------- | ------------------------ | ------------------------------------- |
| Track background     | Secondary background     | `progress.bar.track`                  |
| Fill (on track)      | Positive green           | `progress.state.onTrack`              |
| Fill (warning, >80%) | Warning amber            | `progress.state.warning`              |
| Fill (over, >100%)   | Negative red             | `progress.state.overBudget`           |
| Bar height           | 8px (12px in goal cards) | `progress.bar.height`, `.heightLarge` |
| Border radius        | Fully rounded            | `progress.bar.borderRadius`           |
| Label color (amount) | Primary text             | `progress.label.primary`              |
| Label color (%)      | Secondary text           | `progress.label.secondary`            |

### Status Indicator Rules

**Critical:** Status is NEVER conveyed by color alone. Every status includes:

| Status         | Color | Icon | Text Label                     | Token                       |
| -------------- | ----- | ---- | ------------------------------ | --------------------------- |
| On track       | Green | ✓    | "On track — $X remaining"      | `progress.state.onTrack`    |
| Warning (>80%) | Amber | ⚠    | "Almost there — $X remaining"  | `progress.state.warning`    |
| Over budget    | Red   | ↑    | "Over by $X — want to adjust?" | `progress.state.overBudget` |
| Complete       | Green | ★    | "Goal complete!"               | `progress.state.complete`   |

### Donut Spec

| Property           | Value                           | Token                                     |
| ------------------ | ------------------------------- | ----------------------------------------- |
| Inner radius ratio | 60% of outer radius             | `chart.donut.innerRadiusRatio`            |
| Slice stroke       | 2px in background color         | `chart.donut.strokeWidth`, `.strokeColor` |
| Center label       | Total amount, `typeScale.title` | —                                         |
| Slice colors       | CVD-safe palette (max 6 slices) | `chart.series.1` through `.6`             |
| Overflow color     | Neutral gray                    | `chart.series.overflow`                   |
| Container height   | 320px                           | `chart.container.defaultHeight`           |

---

## Category Breakdown Pie Chart

### Purpose

Shows spending composition. Answers: "Where does my money go?"

### Spec

| Property        | Value                                    | Token                                       |
| --------------- | ---------------------------------------- | ------------------------------------------- |
| Max slices      | 7 (combine remainder as "Other")         | —                                           |
| Slice colors    | CVD-safe palette                         | `chart.series.1` through `.6` + `.overflow` |
| Label placement | On slice if > 5% of total                | —                                           |
| Legend          | Below chart on mobile, beside on desktop | —                                           |
| Legend swatch   | 12px with 4px radius                     | `chart.legend.swatchSize`, `.swatchRadius`  |
| Legend text     | Secondary text color                     | `chart.legend.text`                         |
| Legend gap      | 16px between items                       | `chart.legend.gap`                          |

### Behavioral Contract

| Behavior         | Description                                          |
| ---------------- | ---------------------------------------------------- |
| Data shape       | 2–7 categorical items with numeric values            |
| Overflow         | >7 categories grouped as "Other" in neutral gray     |
| Interaction      | Tap/click slice → tooltip with category + amount + % |
| Keyboard         | Arrow keys rotate through slices, Enter for tooltip  |
| Label visibility | Show labels on slices >5% of total                   |
| Tooltip          | "Food: $450 (56.3%)"                                 |
| Empty state      | "No category data" + CTA to categorize transactions  |

---

## Goal Progress Indicator

### Purpose

Shows savings goal progress. Answers: "How close am I to my goal?"

### Anatomy

```
┌─────────────────────────────────────────────────────────────┐
│  🎯 Emergency Fund                                          │
│                                                             │
│  ██████████████████████████████░░░░░░░░░  73%               │
│                                                             │
│  $7,300 saved of $10,000 goal                               │
│                                                             │
│  At your current pace, you'll reach this goal by March 2026 │
│                                                             │
│  ✓ On track                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Goal Progress Ring (Alternative)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ╭───────────╮                                  │
│           ╭──╯           ╰──╮                               │
│         ╭─╯  ██████████   ╰─╮       Emergency Fund         │
│         │                    │                               │
│         │   73%              │       $7,300 of $10,000      │
│         │                    │       On track ✓             │
│         ╰─╮  ░░░░░░░░░  ╭─╯                                │
│           ╰──╮         ╭──╯        Est. March 2026          │
│              ╰─────────╯                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Spec

| Property             | Value                       | Token                       |
| -------------------- | --------------------------- | --------------------------- |
| Progress fill        | Interactive blue (default)  | `progress.ring.fill`        |
| Track background     | Secondary background        | `progress.ring.track`       |
| Ring stroke width    | 8px                         | `progress.ring.strokeWidth` |
| Status: on track     | Green + ✓ icon              | `progress.state.onTrack`    |
| Status: behind       | Amber + ⚠ icon              | `progress.state.warning`    |
| Status: complete     | Green + ★ icon              | `progress.state.complete`   |
| Completion animation | Celebration (800ms spring)  | `animation.celebrate.*`     |
| Amount text          | typeScale.title             | —                           |
| Goal text            | typeScale.body              | —                           |
| Estimate text        | typeScale.label + secondary | —                           |

### Accessibility

| Requirement    | Implementation                                                 |
| -------------- | -------------------------------------------------------------- |
| Role           | `role="progressbar"`                                           |
| Value          | `aria-valuenow="73"` `aria-valuemin="0"` `aria-valuemax="100"` |
| Label          | `aria-label="Emergency Fund: 73% complete, $7,300 of $10,000"` |
| Status text    | Visible text below bar/ring, not color-only                    |
| Completion     | `aria-live="polite"` announces "Goal complete!"                |
| Reduced motion | Fill animates instantly, celebration skipped                   |

---

## Responsive Layout System

### Chart Container Sizing

| Breakpoint | Container Width | Chart Height | Legend Position | Behavior                  |
| ---------- | --------------- | ------------ | --------------- | ------------------------- |
| Mobile     | 100%            | 240px        | Below chart     | Full-width, large targets |
| Tablet     | 100%            | 320px        | Beside chart    | Standard layout           |
| Desktop    | 100% of panel   | 320px        | Beside chart    | Hover tooltips            |
| Widescreen | 50% (2-up)      | 400px        | Beside chart    | Side-by-side charts       |

### Dashboard Chart Grid

```
Mobile (< 640px):
┌──────────────────────┐
│  [Budget Donut]      │
├──────────────────────┤
│  [Spending Bar]      │
├──────────────────────┤
│  [Trend Line]        │
├──────────────────────┤
│  [Goal Progress]     │
└──────────────────────┘

Tablet (640–1023px):
┌───────────────┬──────────────┐
│ [Budget Donut]│[Spending Bar]│
├───────────────┴──────────────┤
│      [Trend Line — full]     │
├──────────────────────────────┤
│      [Goal Progress Cards]   │
└──────────────────────────────┘

Desktop (1024px+):
┌──────────┬──────────┬──────────┐
│  Budget  │ Spending │  Trend   │
│  Donut   │   Bar    │  Line    │
├──────────┴──────────┴──────────┤
│     [Goal Progress Cards Row]  │
└────────────────────────────────┘
```

### Mobile-Specific Adaptations

| Adaptation            | Value                          | Why                         |
| --------------------- | ------------------------------ | --------------------------- |
| Touch target min      | 44×44 CSS px (48×48 cognitive) | Fat finger tolerance        |
| Y-axis width          | 60px (vs 80px desktop)         | More chart area on mobile   |
| Legend: single column | Below chart                    | Fits narrow viewport        |
| Donut center label    | 1.5rem (vs 1.25rem)            | Readability at arm's length |
| Tooltip: tap to show  | Tap on element                 | No hover on touch screens   |
| Bar width             | Min 24px                       | Tap-friendly bar width      |

---

## Animation Patterns

### Chart Entrance Animations

| Chart Type    | Animation                      | Duration | Easing   | Reduced Motion   |
| ------------- | ------------------------------ | -------- | -------- | ---------------- |
| Line chart    | Draw from left to right        | 400ms    | ease-out | Instant render   |
| Bar chart     | Bars grow up from baseline     | 400ms    | ease-out | Instant render   |
| Pie/Donut     | Slices expand from 0°          | 400ms    | ease-out | Instant render   |
| Progress bar  | Fill grows from left           | 400ms    | ease-out | Instant render   |
| Progress ring | Ring fills clockwise           | 400ms    | ease-out | Instant render   |
| Goal complete | Celebration burst + ring pulse | 800ms    | spring   | Show final state |

### Data Transition Animations

| Transition          | Animation                  | Duration | Reduced Motion |
| ------------------- | -------------------------- | -------- | -------------- |
| Value change        | Morph to new position/size | 250ms    | Instant swap   |
| Category add/remove | Fade in/out + reflow       | 250ms    | Instant swap   |
| Series toggle       | Fade in/out line/bars      | 150ms    | Instant toggle |
| Time range change   | Crossfade old → new data   | 250ms    | Instant swap   |

### Token Bindings

| Animation        | Duration Token                       | Easing Token                       |
| ---------------- | ------------------------------------ | ---------------------------------- |
| Chart entrance   | `chart.animation.entranceDuration`   | `chart.animation.entranceEasing`   |
| Data transition  | `chart.animation.transitionDuration` | `chart.animation.transitionEasing` |
| Progress fill    | `progress.animation.fillDuration`    | `progress.animation.fillEasing`    |
| Goal celebration | `celebration.animationDuration`      | `celebration.animationEasing`      |

### Reduced Motion Implementation

```css
@media (prefers-reduced-motion: reduce) {
  .chart-animate {
    animation: none !important;
  }
  .chart-transition {
    transition: none !important;
  }
}

/* Cognitive mode — superset of reduced motion */
[data-a11y-cognitive='true'] .chart-animate,
[data-a11y-cognitive='true'] .chart-transition {
  animation: none !important;
  transition: none !important;
}
```

---

## Color Palette Reference

### CVD-Safe Series Colors

```
Series  Name     Hex       Pattern (line charts)
──────  ───────  ────────  ────────────────────────
  1     Blue     #648FFF   ──────── (solid)
  2     Purple   #785EF0   ┄┄┄┄┄┄┄┄ (dashed 6,4)
  3     Magenta  #DC267F   ╌╌╌╌╌╌╌╌ (dashed 3,3)
  4     Orange   #FE6100   ─ ─ ─ ─  (dash-dot 8,3,2,3)
  5     Gold     #FFB000   ┈┈┈┈┈┈┈┈ (dotted 2,4)
  6     Teal     #009E73   ─── ───  (long dash 12,6)
  —     Other    #9CA3AF   ░░░░░░░░ (solid, lighter)
```

### Financial Semantic Colors (Always with Icon + Text)

| Concept         | Light     | Dark      | Icon | Text Pattern           |
| --------------- | --------- | --------- | ---- | ---------------------- |
| Income/Positive | Green 700 | Green 500 | ↑    | "Income: +$X,XXX"      |
| Expense/Neg     | Red 600   | Red 500   | ↓    | "Expense: −$X,XXX"     |
| On track        | Green 600 | Green 500 | ✓    | "On track"             |
| Warning         | Amber 600 | Amber 500 | ⚠    | "Almost at limit"      |
| Over budget     | Red 600   | Red 500   | ↑    | "Over by $X — adjust?" |

---

## Token Binding Reference

### Complete Token Map

| UI Element                  | Token Path                           | Tier      |
| --------------------------- | ------------------------------------ | --------- |
| Chart background            | `chart.container.background`         | Component |
| Chart padding               | `chart.container.padding`            | Component |
| Chart corner radius         | `chart.container.borderRadius`       | Component |
| Chart min height            | `chart.container.minHeight`          | Component |
| Chart default height        | `chart.container.defaultHeight`      | Component |
| Chart max height            | `chart.container.maxHeight`          | Component |
| Axis line color             | `chart.axis.lineColor`               | Component |
| Axis label color            | `chart.axis.labelColor`              | Component |
| Grid line color             | `chart.axis.gridColor`               | Component |
| Tooltip background          | `chart.tooltip.background`           | Component |
| Tooltip text                | `chart.tooltip.text`                 | Component |
| Tooltip border              | `chart.tooltip.border`               | Component |
| Tooltip radius              | `chart.tooltip.borderRadius`         | Component |
| Tooltip padding X           | `chart.tooltip.paddingX`             | Component |
| Tooltip padding Y           | `chart.tooltip.paddingY`             | Component |
| Tooltip shadow              | `chart.tooltip.shadow`               | Component |
| Legend text color           | `chart.legend.text`                  | Component |
| Legend item gap             | `chart.legend.gap`                   | Component |
| Legend swatch size          | `chart.legend.swatchSize`            | Component |
| Legend swatch radius        | `chart.legend.swatchRadius`          | Component |
| Series colors 1–6           | `chart.series.{1-6}`                 | Component |
| Overflow/Other color        | `chart.series.overflow`              | Component |
| Bar corner radius           | `chart.bar.borderRadius`             | Component |
| Bar gap                     | `chart.bar.gap`                      | Component |
| Donut stroke width          | `chart.donut.strokeWidth`            | Component |
| Donut stroke color          | `chart.donut.strokeColor`            | Component |
| Donut inner radius ratio    | `chart.donut.innerRadiusRatio`       | Component |
| Line stroke width           | `chart.line.strokeWidth`             | Component |
| Line dot radius             | `chart.line.dotRadius`               | Component |
| Line dot radius (active)    | `chart.line.dotRadiusActive`         | Component |
| Progress bar track          | `progress.bar.track`                 | Component |
| Progress bar fill           | `progress.bar.fill`                  | Component |
| Progress bar height         | `progress.bar.height`                | Component |
| Progress bar height (large) | `progress.bar.heightLarge`           | Component |
| Progress bar radius         | `progress.bar.borderRadius`          | Component |
| Progress ring track         | `progress.ring.track`                | Component |
| Progress ring fill          | `progress.ring.fill`                 | Component |
| Progress ring stroke        | `progress.ring.strokeWidth`          | Component |
| Progress state: on track    | `progress.state.onTrack`             | Component |
| Progress state: warning     | `progress.state.warning`             | Component |
| Progress state: over budget | `progress.state.overBudget`          | Component |
| Progress state: complete    | `progress.state.complete`            | Component |
| Empty state icon color      | `chart.emptyState.iconColor`         | Component |
| Empty state text color      | `chart.emptyState.textColor`         | Component |
| Entrance animation duration | `chart.animation.entranceDuration`   | Component |
| Entrance animation easing   | `chart.animation.entranceEasing`     | Component |
| Transition duration         | `chart.animation.transitionDuration` | Component |
| Transition easing           | `chart.animation.transitionEasing`   | Component |

---

## Accessibility Contract

### All Charts

| Requirement                     | Spec                                              |
| ------------------------------- | ------------------------------------------------- |
| Minimum contrast (filled areas) | 3:1 against adjacent background (WCAG AA UI)      |
| Minimum contrast (text labels)  | 4.5:1 against background (WCAG AA text)           |
| Never color alone               | Every colored element has icon, pattern, or label |
| Keyboard navigable              | Arrow keys, Home/End, Enter/Space, Escape         |
| Screen reader description       | `buildChartDescription()` in `.sr-only`           |
| Data table alternative          | "View as table" toggle on every chart             |
| Reduced motion                  | Entrance + transition animations disabled         |
| Cognitive mode                  | All animations disabled, larger touch targets     |
| Touch targets                   | Min 44×44 CSS px (48×48 in cognitive mode)        |
| Tooltips on mobile              | Tap to show, tap outside to dismiss               |
| Focus indicator                 | 3px outline in `semantic.border.focus` color      |
| Live region                     | `aria-live="polite"` announces data changes       |

### Chart-Specific ARIA

| Chart Type    | Container Role       | Roledescription | Data Point Role   |
| ------------- | -------------------- | --------------- | ----------------- |
| Line chart    | `role="figure"`      | `"line chart"`  | `role="listitem"` |
| Bar chart     | `role="figure"`      | `"bar chart"`   | `role="listitem"` |
| Pie chart     | `role="figure"`      | `"pie chart"`   | `role="listitem"` |
| Donut chart   | `role="figure"`      | `"donut chart"` | `role="listitem"` |
| Progress bar  | `role="progressbar"` | —               | —                 |
| Progress ring | `role="progressbar"` | —               | —                 |
