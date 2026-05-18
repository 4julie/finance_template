---
name: ux-testing
description: >
  UX testing methodology for the Finance app. Use for topics related to alpha testing,
  beta testing, QA, bug discovery, testing scenarios, manual testing, or user experience validation.
---

# UX Testing Skill

## Testing Session Structure

### Pre-Session Setup

1. **Environment**: Ensure local dev server is running and seeded with test data
2. **Platforms**: Identify which platforms are under test (check platform maturity table below)
3. **Scope**: Define feature areas to cover (or test everything for alpha sessions)
4. **Tooling**: Have browser DevTools open, console visible, network tab ready
5. **State tracking**: Use SQL todos or a GitHub issue as the session tracker

### Platform Maturity (Source of Truth)

| Platform | Status                             | UI Screens                                       | Testing Priority |
| -------- | ---------------------------------- | ------------------------------------------------ | ---------------- |
| Web      | Full implementation                | All pages                                        | Primary          |
| iOS      | Full SwiftUI implementation        | Transactions, Budgets, Goals, Accounts, Settings | High             |
| Windows  | Full Compose Desktop               | Transactions, Budgets, Goals, Navigation         | High             |
| Android  | Scaffold only (manifest + widgets) | None                                             | Skip for now     |

Update this table as platforms evolve.

### Session Flow

```
1. Human tests features, reports bugs verbally/in chat
2. Agent dispatches parallel investigation agents (one per bug area)
3. Investigations examine codebase for root cause, affected files, and fix approach
4. Agent files GitHub issues with full context
5. Agent audits issues for scope (platform, shared, cross-platform)
6. Repeat until testing session complete
```

## Bug Investigation Methodology

### Parallel Dispatch Pattern

When multiple bugs are reported, group them by codebase area and dispatch parallel agents:

```
Area groupings:
- Navigation/routing (routes, layout, active state, scroll)
- Forms/input (fields, validation, formatting)
- Search/filter (query logic, UI, performance)
- Data display (charts, lists, cards, detail pages)
- Import/export (wizards, file handling, mapping)
- Auth/security (login, session, permissions)
- Layout/CSS (responsive, alignment, transitions)
```

Each investigation agent should:

1. Find the relevant source files (grep for component names, route paths)
2. Read the implementation (exact lines, function signatures)
3. Identify the root cause (not just symptoms)
4. Check if the same pattern exists elsewhere (similar bugs in other features)
5. Note which platforms share the code vs have independent implementations
6. Suggest a concrete fix approach

### What to Look For (Per Feature Area)

#### Navigation

- Scroll position preservation/reset on route change
- Active state accuracy (forward nav, back nav, browser history)
- Deep linking (direct URL, CTRL+click, bookmarks)
- Auth guards (can unauth users see protected pages? Can auth users see login?)
- Breadcrumb accuracy and responsiveness across viewports

#### Forms

- Field completeness (do form fields match the data schema?)
- Validation (required fields, format rules, error messages)
- Input UX (auto-format, masks, paste handling)
- Submission feedback (loading state, success/error, navigation after)
- Accessibility (labels, focus order, error announcements)

#### Search & Filter

- Field coverage (which data fields are actually searched?)
- Match quality (partial matches, case sensitivity, stemming)
- Sort options (what fields, directions, persistence)
- Filter composition (AND/OR, multiple active, clear all)
- Performance (debounce, loading indicators)
- Result context (why did this result match?)

#### Data Display (Lists, Cards, Charts)

- Clickability (can items be selected/navigated to?)
- Empty states (graceful when no data exists)
- Error states (what happens when data fetch fails?)
- Responsive layout (cards at every viewport width)
- Chart readability (overlapping labels, legends, tooltips)
- Action buttons (hover/focus states, independence, icon consistency)

#### Import/Export

- Navigation (can user get back to main app?)
- Flow completeness (every step reachable and completable)
- Validation (error recovery, inline correction)
- Preview (see results before committing)
- Duplicate handling (detection accuracy, user control)
- Format detection (auto-recognize source systems)

#### Layout & Transitions

- Loading states (skeleton, spinner, or plain text?)
- Page transitions (smooth or jarring?)
- Persistent UI elements (sync status, banners — too prominent?)
- Double-rendering (same info shown twice at different breakpoints)
- CSS specifics (hover states, focus indicators, alignment)

## Bug Report Template

Every filed issue MUST include:

```markdown
## Problem

[User-visible description of what's wrong]

## Root Cause

[Technical explanation with file:line references]

- `path/to/file.tsx:42-55` — what's happening here
- Why this causes the observed behavior

## Fix

[Concrete fix approach — not vague "improve this"]

1. Specific change to make
2. Where to make it
3. What to verify after

## Files

- `path/to/file.tsx:NN-MM` (primary)
- `path/to/related.css:NN-MM` (secondary)

## Cross-Platform

- **iOS**: How this applies (or doesn't) on iOS
- **Android**: How this applies (or doesn't) on Android
- **Windows**: How this applies (or doesn't) on Windows
- Does this need platform-specific issues? (see issue-management skill)
```

### Severity Classification

| Severity      | Description                                   | Example                                          |
| ------------- | --------------------------------------------- | ------------------------------------------------ |
| P0 - Critical | Feature completely broken, data loss possible | Delete account doesn't delete, transactions lost |
| P1 - High     | Core workflow significantly impaired          | Can't search by category, can't edit budgets     |
| P2 - Medium   | UX degradation but workaround exists          | Double title on mobile, hover both icons         |
| P3 - Low      | Polish/enhancement, no workflow impact        | Cursor alignment, icon style preference          |

## Testing Scenarios (Ordered Checklist)

Use this to guide structured testing sessions:

### 1. Authentication Flow

- [ ] Sign up (new account creation)
- [ ] Sign in (existing account)
- [ ] Invalid credentials (error messaging)
- [ ] Sign out (accessible, actually works)
- [ ] Delete account (actually deletes)
- [ ] Passkey/biometric setup
- [ ] Password requirements enforced
- [ ] Session persistence (close/reopen browser)
- [ ] Auth guard (navigate to /login while logged in)

### 2. Navigation & Layout

- [ ] Tab switching (active state correct)
- [ ] Scroll reset on forward nav
- [ ] Back/forward browser buttons
- [ ] Deep links (direct URL entry)
- [ ] CTRL+Click to open in new tab
- [ ] Responsive breakpoints (mobile -> desktop)
- [ ] Sidebar positioning (footer not buried)
- [ ] Loading transitions between pages

### 3. Transactions

- [ ] Create new transaction (all fields)
- [ ] Edit existing transaction
- [ ] Delete transaction (with confirmation)
- [ ] Search (multiple field types)
- [ ] Filter by category/account/date
- [ ] Sort (ascending/descending)
- [ ] Transaction detail view (navigate from list)
- [ ] Dashboard recent transactions (clickable)

### 4. Import

- [ ] Upload CSV file
- [ ] Format auto-detection
- [ ] Column mapping
- [ ] Preview before commit
- [ ] Validation error handling
- [ ] Duplicate detection
- [ ] Account selection flow
- [ ] Navigation back to main app

### 5. Budgets & Goals

- [ ] Create budget/goal
- [ ] Edit from detail page
- [ ] Delete from detail page
- [ ] Progress visualization
- [ ] Card display at various sizes
- [ ] Action button hover states

### 6. Charts & Reports

- [ ] Pie chart with many categories (label overlap)
- [ ] Trend chart (time period selection)
- [ ] Dashboard summary accuracy
- [ ] Chart responsiveness
- [ ] Empty state when no data

### 7. Settings & System

- [ ] Sync status indicator
- [ ] Keyboard shortcuts
- [ ] Feedback mechanism
- [ ] Accessibility (screen reader, keyboard nav)
- [ ] Console errors (CSP, CORS, JS errors)

## Filing Issues Efficiently

### PowerShell-Safe Issue Creation

Complex issue bodies with backticks, code fences, and special characters WILL break in PowerShell heredocs. Always use the file-based approach:

```javascript
// Write body to temp file, then use --body-file
const fs = require('fs');
const { execSync } = require('child_process');
const bodyFile = path.join(os.tmpdir(), 'gh-issue-body.md');

fs.writeFileSync(bodyFile, issueBody, 'utf8');
execSync(`gh issue create --title "${title}" --body-file "${bodyFile}" --label "${labels}"`);
```

### Batch Filing Pattern

When filing many issues from a testing session:

1. Write a Node.js script with all issues as objects
2. Loop through, writing each body to a temp file
3. Call `gh issue create --body-file` for each
4. Capture URLs and log them
5. Clean up temp files after

### Post-Filing Audit

After filing all issues from a session, audit for:

- [ ] Every issue has correct platform label(s)
- [ ] Cross-platform issues have `platform:shared` label
- [ ] Platform-specific duplicates created where implementation differs
- [ ] No true duplicates (same fix, same file, same platform)
- [ ] All issues have root cause and fix sections
- [ ] Related issues cross-referenced with `Refs #N`
- [ ] Priority labels applied based on severity

## Console Error Triage

During testing, watch the browser console for:

| Error Type                   | Priority | Action                                     |
| ---------------------------- | -------- | ------------------------------------------ |
| CSP violations               | P2       | File issue, check vite.config.ts headers   |
| Unhandled promise rejections | P1       | Investigate — likely broken feature        |
| 404s for assets              | P2       | Check build/public paths                   |
| CORS errors                  | P1       | Check API/backend configuration            |
| React errors (minified)      | P1       | Use React DevTools, check error boundaries |
| Deprecation warnings         | P3       | Note for future cleanup                    |
| WebSocket disconnects        | P3       | Usually Vite HMR, not user-facing          |
