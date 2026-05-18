---
name: issue-management
description: >
  Issue creation quality, cross-platform scoping, and duplicate management for the Finance monorepo.
  Use for topics related to issue filing, bug reports, platform scoping, cross-platform duplicates,
  label taxonomy, or issue quality.
---

# Issue Management Skill

## Purpose

This skill covers **issue creation quality and cross-platform scoping** — specifically how to write high-quality issues and decide their platform scope. For issue lifecycle, backlog grooming, milestones, and sprint planning, see the `project-management` skill.

## Label Taxonomy (Canonical)

### Platform Labels

| Label              | When to Use                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `platform:web`     | Bug/fix is in web-only code (CSS, web-specific JS, Vite config, service worker)                            |
| `platform:ios`     | Bug/fix is in iOS-only code (SwiftUI, iOS ViewModels, Apple APIs)                                          |
| `platform:android` | Bug/fix is in Android-only code (Compose, Android ViewModels)                                              |
| `platform:windows` | Bug/fix is in Windows-only code (Compose Desktop, Windows APIs)                                            |
| `platform:shared`  | Bug/fix is in shared code (packages/core, packages/models, packages/sync) OR affects all platforms equally |
| `platform:backend` | Bug/fix is in backend code (services/api, Supabase, Edge Functions)                                        |

### Combining Platform Labels

- **Single platform bug**: Use one platform label (e.g., `platform:web`)
- **Shared code bug affecting all**: Use `platform:shared` on the root issue
- **Same UX bug, different implementations**: Create separate issues per platform (see decision tree)
- **Root issue + platform dupes**: Root issue gets `platform:shared`, each dupe gets its platform label

## Cross-Platform Scoping Decision Tree

When you discover a bug, ask these questions IN ORDER:

```
1. Is the root cause in shared code (packages/core, packages/models, packages/sync)?
   YES → File as platform:shared. Single issue. Fix once, all platforms benefit.
   NO → Continue to Q2.

2. Is the fix purely CSS/layout/web-runtime specific?
   YES → File as platform:web only. No dupes needed.
   NO → Continue to Q3.

3. Does the same bug likely exist on other platforms with real UI?
   NO → File for the observed platform only.
   YES → Continue to Q4.

4. Is the fix implementation identical across platforms?
   YES → File as platform:shared (the fix is conceptual, not code-specific).
         Add cross-platform notes to the single issue.
   NO → Continue to Q5.

5. Does each platform need a DIFFERENT implementation for the fix?
   YES → Create separate issues per platform (adapted for each platform's
         design language and APIs). Cross-reference with "Related: #N".
   NO → File single issue with platform:shared + note the affected platforms.
```

### Common Patterns

| Scenario                                        | Action                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| CSS hover/layout bug                            | `platform:web` only                                                                             |
| Search query only matches 2 fields              | `platform:shared` if query is in shared repo; one issue per platform if each has its own search |
| Missing form field that exists in shared schema | `platform:shared` + platform dupes for UI                                                       |
| Chart label overlap                             | One issue per platform (different chart libraries)                                              |
| Auth guard missing                              | `platform:shared` if auth logic is shared; dupes if each platform has its own routing           |
| Loading state ugly                              | One per platform (different UI frameworks)                                                      |
| Browser-specific (CSP, SW, CORS)                | `platform:web` only                                                                             |
| Amount auto-formatting                          | One per platform (different input handling)                                                     |
| Keyboard shortcuts                              | `platform:web` + `platform:windows` (desktop platforms only)                                    |
| Tag data model needs enhancement                | `platform:shared` (schema change) + UI issues per platform                                      |

### When NOT to Create Platform Duplicates

- Platform has no real UI yet (Android is scaffold-only currently)
- The fix is entirely in shared code that all platforms consume
- The "platform-specific" version would be identical text with a different label
- The platform uses a native control that already handles the behavior correctly

### When to ALWAYS Create Platform Duplicates

- UI component behavior (each platform has different widget libraries)
- Navigation patterns (TabView vs BottomNavigation vs NavigationView vs react-router)
- Input formatting (UITextField vs TextWatcher vs VisualTransformation vs controlled input)
- Gesture/interaction patterns (swipe vs hover vs long-press vs right-click)
- Design language adaptation (Material, Cupertino, Fluent, Web standards)

## Issue Body Quality Standards

### Required Sections for Bug Reports

```markdown
## Problem

[What the user sees/experiences — user-visible language]

## Root Cause

[Technical explanation with exact file:line references from current main branch]

- Cite actual code, not assumptions
- Show the chain: user action → code path → visible result

## Fix

[Concrete, actionable fix — not "improve this" or "make it better"]

- Step 1: specific change
- Step 2: where to make it
- Step 3: what to verify

## Files

[Exact paths with line numbers]

- `apps/web/src/path/to/file.tsx:42-55`

## Cross-Platform

[Assessment of impact on other platforms]

- iOS: [applies/doesn't apply/needs separate issue because...]
- Android: [N/A — scaffold only]
- Windows: [applies/doesn't apply/needs separate issue because...]
```

### Required Sections for Enhancement Requests

```markdown
## Problem / Current State

[What's missing or inadequate]

## Expected Behavior

[Detailed description of the desired state]

## Implementation Notes

[Technical approach, architecture considerations]

## Cross-Platform

[Which platforms need this, with design pattern notes per platform]

## Related Issues

[Links to related/blocking/dependent issues]
```

### Issue Title Convention

```
type(platform): concise description
```

Examples:

- `bug(web): scroll position not resetting on tab change`
- `bug(ios): search only matches payee field`
- `enhancement(windows): keyboard shortcuts for all major actions`
- `enhancement: additional transaction schema fields` (no platform = cross-platform)

## Duplicate Management

### Identifying Duplicates

Two issues are duplicates if:

- Same root cause AND same platform AND same fix
- NOT duplicates if: same symptom but different platforms with different fixes

### Linking Duplicates

- Add comment: "Duplicate of #N" on the duplicate
- Do NOT close issues — only humans merge PRs which auto-close
- Cross-reference with "Related: #N" for related-but-not-duplicate issues

### Cross-Platform Relationships

```
Root issue (#100): platform:shared — "Search should match all fields"
├── #101: platform:ios — "iOS: extend search predicate"
├── #102: platform:windows — "Windows: extend ViewModel filter"
└── #103: platform:web — "Web: expand SQL WHERE clause"
```

Each platform issue should say: "Related: #100 (root issue), #101, #102, #103 (platform siblings)"

## Filing Issues Safely (Technical)

### PowerShell Escaping Problem

PowerShell interprets backtick sequences (`` `u ``, `` `n ``, `` `t ``) as escape characters. Issue bodies with code fences, template literals, or technical content WILL break inline.

### Canonical Pattern: File-Based Creation via Node.js

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const bodyFile = path.join(os.tmpdir(), 'gh-issue-body.md');

function fileIssue(title, labels, body) {
  fs.writeFileSync(bodyFile, body, 'utf8');
  try {
    const out = execSync(
      `gh issue create --title "${title}" --body-file "${bodyFile}" --label "${labels}"`,
      { encoding: 'utf8', cwd: process.cwd() },
    );
    console.log(out.trim());
  } catch (e) {
    console.error('FAILED:', title, e.stderr || e.message);
  }
}

// Use: fileIssue("bug(web): title here", "bug,platform:web", markdownBody);
```

### Rules for Batch Filing

1. Write a single Node.js script with all issues as objects in an array
2. Loop and call `gh issue create --body-file` for each
3. Log each created URL
4. Do NOT use single quotes for titles containing apostrophes (use double quotes + escaped inner quotes)
5. Clean up temp files after batch completes
6. If `gh` is authenticated with an EMU account, switch to personal: `gh auth switch --user <personal>`

### GitHub CLI Account Considerations

- EMU (Enterprise Managed User) accounts can `gh issue create` but may NOT be able to `gh issue comment`, `gh issue edit`, or add labels to existing issues
- Personal accounts have full access to personal repos
- Check with: `gh auth status`
- Switch with: `gh auth switch --user <username>`

## Post-Session Audit Checklist

After filing issues from a testing/discovery session, run this audit:

- [ ] Every issue has at least one platform label
- [ ] Issues in shared code have `platform:shared`
- [ ] CSS/web-runtime issues are `platform:web` only (not over-scoped)
- [ ] Cross-platform bugs have separate issues where implementation differs
- [ ] No accidental true duplicates (same fix, same platform)
- [ ] All issues have Root Cause section with file:line references
- [ ] File:line references verified against current `main` branch
- [ ] Related issues cross-referenced (`Related: #N` or `Refs #N`)
- [ ] Platform duplicates reference parent issue
- [ ] Enhancement issues include implementation notes and cross-platform design patterns
- [ ] Priority labels reflect actual severity (P0 = broken, P3 = polish)

## Gated Operations

When managing issues, agents are allowed to:

- ✅ `gh issue create` (create new issues)
- ✅ `gh issue comment` (add findings, cross-references)
- ✅ `gh issue edit --add-label` (add labels at filing time or during audit)
- ✅ `gh issue list` / `gh issue view` (read operations)

Agents MUST NOT:

- ❌ `gh issue close` (issues close via PR merge only)
- ❌ `gh issue delete`
- ❌ `gh issue transfer`
- ❌ Modify repo settings, create releases, or delete labels
