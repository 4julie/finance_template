# Workflow Pain Points — Finance AI Agents

This document tracks friction points, inefficiencies, and recurring failures in the AI agent development workflow. It serves as both a tracking register and a template for documenting new pain points as they are discovered.

> **Who maintains this:** `@docs-writer` updates this document. Any agent or human contributor can add entries by following the [template](#pain-point-template) below.

---

## Table of Contents

- [Overview](#overview)
- [Severity Levels](#severity-levels)
- [Categories](#categories)
- [Pain Point Template](#pain-point-template)
- [Active Pain Points](#active-pain-points)
  - [CI/CD](#cicd)
  - [Git / Worktree](#git--worktree)
  - [GitHub CLI](#github-cli)
  - [Tooling](#tooling)
  - [Documentation](#documentation)
  - [Cross-Agent Coordination](#cross-agent-coordination)
  - [Workflow](#workflow)
  - [Fleet Operations](#fleet-operations)
- [Resolved Pain Points](#resolved-pain-points)
- [Metrics Summary](#metrics-summary)

---

## Overview

Pain points are identified through:

1. **Direct experience** — Agent encounters friction during a task
2. **CI failure analysis** — Patterns in repeated CI failures across PRs
3. **Retrospective review** — Post-sprint review of what slowed work down
4. **Documentation audits** — Gaps discovered when docs don't match reality

Each pain point is assigned a severity, category, and owner. The goal is to reduce the total count of **Critical** and **High** pain points to zero over time.

---

## Severity Levels

| Level        | Icon | Definition                                                       | SLA (Service Level Agreement) |
| ------------ | ---- | ---------------------------------------------------------------- | ----------------------------- |
| **Critical** | 🔴   | Blocks agent work entirely — cannot proceed without a workaround | Fix within 1 sprint           |
| **High**     | 🟠   | Causes significant delay (>30 min wasted per occurrence)         | Fix within 2 sprints          |
| **Medium**   | 🟡   | Causes minor delay or requires a known workaround                | Fix when convenient           |
| **Low**      | 🟢   | Cosmetic or annoyance — does not block progress                  | Track for future improvement  |

---

## Categories

| Category                     | Description                                                               |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Workflow**                 | Daily development workflow friction (branching, committing, PR lifecycle) |
| **Tooling**                  | IDE, MCP servers, Copilot configuration, build tools                      |
| **CI/CD**                    | GitHub Actions failures, CI monitoring, flaky tests, pipeline issues      |
| **Documentation**            | Missing, outdated, or inaccurate docs that cause agent errors             |
| **Cross-Agent Coordination** | Issues when multiple agents work on related tasks                         |
| **Git / Worktree**           | Worktree lifecycle, branch management, rebase/merge issues                |
| **GitHub CLI**               | `gh` command quirks, API limitations, output parsing issues               |
| **Fleet Operations**         | Fleet dispatch, monitoring, self-healing, and coordination failures       |

---

## Pain Point Template

Use this template when adding a new pain point. Copy the block below and fill in the details.

```markdown
### PP-XXXX: [Short descriptive title]

| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| **ID**         | PP-XXXX                                    |
| **Severity**   | 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low |
| **Category**   | [Category name]                            |
| **First seen** | YYYY-MM-DD                                 |
| **Status**     | Open / In Progress / Resolved              |
| **Owner**      | @agent-name or human                       |

**Description:**
What is the problem? Be specific about what goes wrong.

**Impact:**
How does this affect agent productivity? Quantify if possible (time wasted, frequency).

**Reproduction steps:**

1. Step one
2. Step two
3. Observe the problem

**Current workaround:**
How are agents currently dealing with this? (Or "None — blocks work entirely")

**Suggested fix:**
What should change to eliminate this pain point?

**Related issues:** #NNN, #NNN
```

---

## Active Pain Points

### CI/CD

#### PP-0001: `gh pr checks` shows stale CI results

| Field          | Value                            |
| -------------- | -------------------------------- |
| **ID**         | PP-0001                          |
| **Severity**   | 🔴 Critical                      |
| **Category**   | CI/CD, GitHub CLI                |
| **First seen** | 2025-06                          |
| **Status**     | Resolved (workaround documented) |
| **Owner**      | @devops-engineer                 |

**Description:**
`gh pr checks <number>` displays results from ALL historical workflow runs on a PR, not just the latest push. Agents interpret stale failures as current, leading to unnecessary fix-push-check cycles.

**Impact:**
30–60 minutes wasted per occurrence. Agents enter loops attempting to fix already-resolved failures.

**Reproduction steps:**

1. Push a branch with a CI failure
2. Fix the failure and push again
3. Run `gh pr checks <number>` — the old failure still appears alongside the new run

**Current workaround:**
Use `gh run list --branch <branch> --limit 5` instead, then `gh run watch <run-id>`. Documented in [ci-monitoring.md](ci-monitoring.md).

**Suggested fix:**
GitHub CLI upstream should support `--latest` or `--commit` filtering. Until then, the workaround in `ci-monitoring.md` is canonical.

**Related issues:** None (discovered through agent workflow analysis)

---

#### PP-0002: Agents skip `npm run ci:check` before pushing

| Field          | Value           |
| -------------- | --------------- |
| **ID**         | PP-0002         |
| **Severity**   | 🟠 High         |
| **Category**   | CI/CD, Workflow |
| **First seen** | 2025-06         |
| **Status**     | Open            |
| **Owner**      | All agents      |

**Description:**
Despite documentation in [worktrees.md](worktrees.md) and [fleet-operations.md](fleet-operations.md), agents sometimes push without running `npm run ci:check` first. This causes avoidable CI failures on remote.

**Impact:**
Each avoidable remote CI failure adds 5–15 minutes of wait time plus a fix-push-recheck cycle. Multiplied across fleet operations, this can add hours to a sprint.

**Reproduction steps:**

1. Agent makes code changes
2. Agent commits and pushes directly without running `ci:check`
3. Remote CI fails on formatting/lint that would have been caught locally

**Current workaround:**
Repeated emphasis in documentation. The pre-push checklist is documented in three places: [worktrees.md](worktrees.md), [fleet-operations.md](fleet-operations.md), and [workflow.md](workflow.md).

**Suggested fix:**

1. Add `npm run ci:check` to the `pre-push` git hook for agent sessions
2. Create a shell alias or npm script that wraps `git push` with a `ci:check` gate
3. Consider a Copilot instruction that always includes the checklist when push is mentioned

---

### Git / Worktree

#### PP-0003: Worktree path differences between Windows and Unix

| Field          | Value          |
| -------------- | -------------- |
| **ID**         | PP-0003        |
| **Severity**   | 🟡 Medium      |
| **Category**   | Git / Worktree |
| **First seen** | 2025-07        |
| **Status**     | Open           |
| **Owner**      | @docs-writer   |

**Description:**
Documentation examples use Unix-style paths (`../wt-agent-branch`), but Windows users must use backslash paths or forward slashes in Git Bash. Agents running on Windows sometimes produce invalid worktree paths.

**Impact:**
Minor — typically self-correctable, but adds friction for Windows-based development.

**Reproduction steps:**

1. Follow worktree creation instructions on Windows CMD/PowerShell
2. Path separators may differ from documented examples
3. Agent may attempt Unix paths that fail on Windows

**Current workaround:**
Git on Windows accepts forward slashes in most contexts. Agents can normalize paths.

**Suggested fix:**
Add a "Windows note" callout to [worktrees.md](worktrees.md) showing both path formats.

---

#### PP-0004: No automated detection of stale worktrees

| Field          | Value            |
| -------------- | ---------------- |
| **ID**         | PP-0004          |
| **Severity**   | 🟢 Low           |
| **Category**   | Git / Worktree   |
| **First seen** | 2025-07          |
| **Status**     | Open             |
| **Owner**      | @devops-engineer |

**Description:**
After fleet operations, stale worktrees can accumulate if agents crash or sessions time out before cleanup. There is no automated cleanup or detection mechanism.

**Impact:**
Disk space waste and confusion when scanning for resumable work. Minor impact.

**Reproduction steps:**

1. Run a fleet operation with multiple agents
2. One agent session times out before post-merge cleanup
3. `git worktree list` shows a worktree with no corresponding open PR

**Current workaround:**
Manual `git worktree list` inspection followed by `git worktree remove`.

**Suggested fix:**
Create a `tools/cleanup-worktrees.js` script that compares active worktrees against open PR branches and suggests removal of orphans.

---

### GitHub CLI

#### PP-0005: `gh pr view` merge status returns UNKNOWN immediately after push

| Field          | Value      |
| -------------- | ---------- |
| **ID**         | PP-0005    |
| **Severity**   | 🟡 Medium  |
| **Category**   | GitHub CLI |
| **First seen** | 2025-06    |
| **Status**     | Open       |

**Description:**
Immediately after `git push`, `gh pr view <number> --json mergeable` returns `UNKNOWN` for 10–30 seconds while GitHub computes the merge status. Agents that don't expect this may misinterpret the status.

**Impact:**
Low — the workaround is a simple retry, but agents not aware of the delay may enter error handling paths unnecessarily.

**Reproduction steps:**

1. Push a new commit to a PR branch
2. Immediately run `gh pr view <number> --json mergeable`
3. Result: `UNKNOWN` — GitHub hasn't computed the status yet

**Current workaround:**
Wait 10–15 seconds and retry. Documented in [ci-monitoring.md](ci-monitoring.md).

**Suggested fix:**
Already documented. No further action needed unless agents consistently fail to handle this.

---

### Tooling

#### PP-0006: MCP server connection failures require manual restart

| Field          | Value            |
| -------------- | ---------------- |
| **ID**         | PP-0006          |
| **Severity**   | 🟡 Medium        |
| **Category**   | Tooling          |
| **First seen** | 2025-07          |
| **Status**     | Open             |
| **Owner**      | @devops-engineer |

**Description:**
MCP servers (especially `sequential-thinking` and `memory`) occasionally lose connection and require manual restart through the VS Code command palette. There is no auto-reconnect mechanism.

**Impact:**
Interrupts agent flow. Requires human to open Command Palette → MCP: Start Server. 2–5 minutes lost per occurrence.

**Reproduction steps:**

1. Work in VS Code with Copilot Chat agent mode for an extended session
2. MCP server silently disconnects (no error in chat, just missing tool capability)
3. Agent attempts to use MCP tool and gets no response

**Current workaround:**
Run `MCP: List Servers` in Command Palette to detect disconnected servers, then restart.

**Suggested fix:**
VS Code MCP support may improve auto-reconnect in future updates. Document the manual restart procedure more prominently in [mcp.md](mcp.md).

---

### Documentation

#### PP-0007: `fleet-operations.md` references `gh pr checks` in Step 5

| Field          | Value         |
| -------------- | ------------- |
| **ID**         | PP-0007       |
| **Severity**   | 🟠 High       |
| **Category**   | Documentation |
| **First seen** | 2025-07       |
| **Status**     | Open          |
| **Owner**      | @docs-writer  |

**Description:**
The "Step 5: Complete" section in [fleet-operations.md](fleet-operations.md) (line ~108) says "All PRs have passing CI (`gh pr checks` all green)" — but `gh pr checks` is unreliable (see PP-0001). This contradicts the guidance in [ci-monitoring.md](ci-monitoring.md).

**Impact:**
Agents following fleet-operations.md may use the wrong CI monitoring command.

**Current workaround:**
Agents who have read ci-monitoring.md know to use `gh run list` instead.

**Suggested fix:**
Update fleet-operations.md line ~108 to reference the correct pattern from ci-monitoring.md.

**Related issues:** PP-0001

---

#### PP-0008: Duplicated CI monitoring instructions across three docs

| Field          | Value         |
| -------------- | ------------- |
| **ID**         | PP-0008       |
| **Severity**   | 🟡 Medium     |
| **Category**   | Documentation |
| **First seen** | 2025-07       |
| **Status**     | Open          |
| **Owner**      | @docs-writer  |

**Description:**
CI monitoring instructions appear in [workflow.md](workflow.md), [worktrees.md](worktrees.md), and [fleet-operations.md](fleet-operations.md), with varying levels of detail and some inconsistencies. The canonical guide is [ci-monitoring.md](ci-monitoring.md), but the other docs don't consistently defer to it.

**Impact:**
Agents may follow outdated instructions from a non-canonical source.

**Suggested fix:**
Replace inline CI monitoring instructions in workflow.md, worktrees.md, and fleet-operations.md with brief summaries and links to ci-monitoring.md as the single source of truth.

---

### Cross-Agent Coordination

#### PP-0009: No standardized handoff format between agents

| Field          | Value                    |
| -------------- | ------------------------ |
| **ID**         | PP-0009                  |
| **Severity**   | 🟡 Medium                |
| **Category**   | Cross-Agent Coordination |
| **First seen** | 2025-07                  |
| **Status**     | Open                     |
| **Owner**      | @architect               |

**Description:**
When one agent's work depends on another (e.g., `@kmp-engineer` finishes the shared API, then `@android-engineer` consumes it), there is no standardized format for the handoff message. Agents must read the full PR to understand the interface.

**Impact:**
Downstream agents spend extra time parsing upstream PRs to understand what changed and what API surface is available.

**Suggested fix:**
Define a `## Agent Handoff` PR section template that includes: exported API surface, breaking changes, integration notes, and test commands.

---

### Workflow

#### PP-0010: `force-with-lease` requires human approval but is needed for routine rebases

| Field          | Value                    |
| -------------- | ------------------------ |
| **ID**         | PP-0010                  |
| **Severity**   | 🟡 Medium                |
| **Category**   | Workflow, Git / Worktree |
| **First seen** | 2025-07                  |
| **Status**     | Open                     |
| **Owner**      | @architect               |

**Description:**
After `git rebase origin/main`, agents must force-push their feature branch. The `--force-with-lease` flag requires human approval per [restrictions.md](restrictions.md). This creates a bottleneck when the human is unavailable and the agent has already rebased.

**Impact:**
Agent work is blocked until a human approves the force-push. Can delay a PR by hours.

**Reproduction steps:**

1. Agent rebases feature branch on origin/main
2. Agent needs to push — requires `--force-with-lease`
3. Human is not available to approve
4. Work stalls

**Current workaround:**
Agents can avoid rebasing until just before requesting human review. But this means CI runs against a stale base, increasing conflict risk.

**Suggested fix:**
Consider auto-approving `--force-with-lease` on the agent's own feature branch (when no other collaborator has pushed to it). This is safe because the branch is single-writer.

---

### Fleet Operations

#### PP-0011: Fleet status tracking relies on manual PR comments

| Field          | Value            |
| -------------- | ---------------- |
| **ID**         | PP-0011          |
| **Severity**   | 🟡 Medium        |
| **Category**   | Fleet Operations |
| **First seen** | 2025-07          |
| **Status**     | Open             |
| **Owner**      | @devops-engineer |

**Description:**
Fleet health monitoring (documented in [fleet-operations.md](fleet-operations.md)) requires the orchestrator to manually update a tracking comment in the parent issue with each agent's PR status. This is tedious and prone to going stale.

**Impact:**
Fleet status is often out of date. Human reviewers must manually check each PR instead of reading a centralized status.

**Suggested fix:**
Create a GitHub Actions workflow or script (`tools/fleet-status.sh`) that automatically generates a fleet status table from open PRs matching a label or issue reference.

---

#### PP-0012: No fleet-wide integration test after all PRs pass individually

| Field          | Value                   |
| -------------- | ----------------------- |
| **ID**         | PP-0012                 |
| **Severity**   | 🟠 High                 |
| **Category**   | Fleet Operations, CI/CD |
| **First seen** | 2025-07                 |
| **Status**     | Open                    |
| **Owner**      | @devops-engineer        |

**Description:**
Each fleet agent's PR passes CI independently, but there is no mechanism to run an integration test that combines all fleet PRs before merging. Merge order can introduce breakage.

**Impact:**
`main` can break if fleet PRs have subtle interdependencies not caught by individual CI runs.

**Suggested fix:**

1. Define a merge-train pattern: merge PRs one at a time, each rebased on the prior merge
2. Or: create a temporary integration branch that combines all fleet PRs for a combined CI run
3. Document the chosen approach in fleet-operations.md

---

## Resolved Pain Points

| ID      | Title                              | Severity | Resolved | Resolution                                |
| ------- | ---------------------------------- | -------- | -------- | ----------------------------------------- |
| PP-0001 | `gh pr checks` shows stale results | 🔴       | 2025-06  | Documented workaround in ci-monitoring.md |

---

## Metrics Summary

Track these metrics monthly to measure improvement. See [workflow-metrics.md](workflow-metrics.md) for detailed metric definitions.

| Metric                                  | Current | Target  |
| --------------------------------------- | ------- | ------- |
| Total open pain points                  | 11      | < 5     |
| Critical pain points                    | 0       | 0       |
| High pain points                        | 3       | 0       |
| Avg CI failures per PR (avoidable)      | —       | < 0.5   |
| Avg time from push to merge-ready       | —       | < 30min |
| Fleet operations completed without help | —       | > 80%   |

---

_Last updated: 2025-07-18. Maintained by `@docs-writer`._
