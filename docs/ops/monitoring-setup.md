# CI/CD Monitoring Setup

This document describes the CI/CD monitoring infrastructure for the Finance monorepo, including alerting rules, incident response, and dashboard configuration.

> **Related:** [CI Workflow](ci-workflow.md) | [Release Process](release-process.md) | [Deployment Runbook](deployment-runbook.md)

---

## Overview

CI health is monitored through three complementary mechanisms:

1. **GitHub Actions workflows** — `ci-health.yml` and `build-perf.yml` run on schedule
2. **Local tooling** — `tools/ci-health-dashboard.js` for on-demand checks
3. **GitHub Security tab** — CodeQL and dependency scanning results

## Monitored Workflows

| Workflow               | Schedule             | What it monitors                                 |
| ---------------------- | -------------------- | ------------------------------------------------ |
| `ci-health.yml`        | Weekly (Mon 7AM UTC) | Success rates, flaky tests, trend analysis       |
| `build-perf.yml`       | Weekly (Tue 6AM UTC) | Build times, cache hit rates, P50/P90/P99        |
| `dependency-audit.yml` | Weekly (Wed 5AM UTC) | npm + Gradle vulnerabilities, license compliance |
| `security.yml`         | Weekly (Mon 6AM UTC) | CodeQL SAST, secret detection                    |
| `stale-detection.yml`  | On schedule          | Stale issues and PRs                             |

## Alerting Rules

### CI Pipeline Health

| Condition                     | Severity     | Action                                             |
| ----------------------------- | ------------ | -------------------------------------------------- |
| Success rate < 80%            | **Critical** | Auto-creates GitHub issue, investigate immediately |
| Success rate 80-95%           | **Warning**  | Review in weekly triage                            |
| P90 build time > 15min        | **Warning**  | Investigate caching, consider splitting jobs       |
| Build time trend > +15%       | **Warning**  | Review recent dependency/config changes            |
| Flaky test detected (re-runs) | **Medium**   | Add to flaky test tracking issue                   |

### Dependency Security

| Condition                         | Severity     | Action                        |
| --------------------------------- | ------------ | ----------------------------- |
| Critical CVE in production dep    | **Critical** | Block merges, create fix PR   |
| High CVE in production dep        | **High**     | Fix within current sprint     |
| Moderate CVE                      | **Medium**   | Fix in next sprint            |
| GPL-3.0/AGPL-3.0 license detected | **High**     | Remove dependency immediately |

### Build Performance

| Metric           | Budget      | Action on violation                    |
| ---------------- | ----------- | -------------------------------------- |
| Web bundle size  | Track trend | Alert if > 20% increase week-over-week |
| Android APK size | Track trend | Alert if > 10% increase                |
| KMP build time   | Track trend | Investigate if P90 > 15min             |
| npm install time | Track trend | Review dependency count                |

## Local Dashboard

Run the CI health dashboard locally:

```bash
# Quick status check
node tools/ci-health-dashboard.js

# Extended analysis
node tools/ci-health-dashboard.js --days 14

# Alerts only
node tools/ci-health-dashboard.js --alerts-only

# JSON output for scripting
node tools/ci-health-dashboard.js --json
```

## Fleet Monitoring

For fleet (parallel agent) operations:

```bash
# Monitor all open fleet PRs
node tools/fleet-status.js

# Watch mode (polls every 60s)
node tools/fleet-status.js --watch

# Check for stale worktrees
node tools/worktree-cleanup.js
```

## Incident Response

### CI Pipeline Failure

1. **Identify**: Check `gh run list --workflow=<name> --status=failure`
2. **Diagnose**: `gh run view <id> --log-failed`
3. **Triage**: Is it flaky (re-run passes)? Is it a real failure?
4. **Fix**: Create a fix branch, push, verify CI passes
5. **Prevent**: Add regression test, update monitoring thresholds

### Build Performance Degradation

1. **Identify**: `node tools/build-analysis.js --recommend`
2. **Diagnose**: Check Turbo cache hits, Gradle cache effectiveness
3. **Root cause**: New dependency? Config change? Source growth?
4. **Fix**: Optimize build config, split jobs, improve caching
5. **Verify**: Run `node tools/performance-benchmark.js --compare`

### Dependency Vulnerability

1. **Identify**: `node tools/dependency-audit.js`
2. **Assess**: Check CVE severity and exploitability
3. **Fix**: `npm audit fix` or update `gradle/libs.versions.toml`
4. **Verify**: Re-run audit, check no regressions
5. **Document**: Note in PR description which CVEs are resolved

## Dashboard Metrics Reference

| Metric          | Source                 | Healthy         | Warning         | Critical      |
| --------------- | ---------------------- | --------------- | --------------- | ------------- |
| CI success rate | `ci-health.yml`        | >= 95%          | 80-95%          | < 80%         |
| Avg build time  | `build-perf.yml`       | < 10min         | 10-15min        | > 15min       |
| Flaky test rate | `ci-health.yml`        | 0 re-runs       | 1-3 re-runs     | > 3 re-runs   |
| npm audit       | `dependency-audit.yml` | 0 high/critical | moderate issues | high/critical |
| CodeQL findings | `security.yml`         | 0 findings      | low severity    | high severity |

## Configuration

### Environment Variables

| Variable       | Purpose                 | Where                    |
| -------------- | ----------------------- | ------------------------ |
| `TURBO_TOKEN`  | Turbo remote cache auth | GitHub Actions secret    |
| `TURBO_TEAM`   | Turbo team identifier   | GitHub Actions secret    |
| `GITHUB_TOKEN` | GitHub API access       | Auto-provided in Actions |

### Scheduled Workflow Cadence

All scheduled workflows run during low-activity hours (UTC mornings) to avoid impacting developer CI queues:

- **Monday 6AM**: Security scanning
- **Monday 7AM**: CI health report
- **Tuesday 6AM**: Build performance report
- **Wednesday 5AM**: Dependency audit
