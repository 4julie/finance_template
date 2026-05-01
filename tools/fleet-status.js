#!/usr/bin/env node

/**
 * Fleet Status - Monitor fleet PR health and CI status.
 *
 * Usage:
 *   node tools/fleet-status.js          # Show all open fleet PRs
 *   node tools/fleet-status.js --watch  # Poll every 60s
 *   node tools/fleet-status.js --help   # Show usage
 *
 * Requires: gh CLI authenticated with repo access
 *
 * Monitors:
 *   - Open PRs from fleet agents (wt-* branches)
 *   - CI check status per PR
 *   - Merge conflicts
 *   - Stale PRs (no activity > 48h)
 *
 * Issue: #sprint-10
 */

const { execSync } = require('child_process');
const { resolve } = require('path');

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Fleet Status - Finance Monorepo

Usage:
  node tools/fleet-status.js [options]

Options:
  --watch          Poll every 60 seconds
  --stale-hours <n> Hours before a PR is considered stale (default: 48)
  --json           Output JSON
  --help, -h       Show this help message
`);
  process.exit(0);
}

const doWatch = args.includes('--watch');
const staleHours = args.includes('--stale-hours')
  ? parseInt(args[args.indexOf('--stale-hours') + 1], 10)
  : 48;
const doJson = args.includes('--json');

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = {
  bold: (s) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s) => (supportsColor ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s) => (supportsColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s),
  dim: (s) => (supportsColor ? `\x1b[2m${s}\x1b[0m` : s),
};
const PASS = '\u2705';
const FAIL = '\u274C';
const WARN = '\u26A0\uFE0F';

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe', timeout: 30000 }).trim();
  } catch {
    return null;
  }
}

function getOpenPRs() {
  const result = run(
    'gh pr list --state=open --limit=100 --json=number,title,headRefName,updatedAt,statusCheckRollup,mergeable,isDraft,author',
  );
  if (!result) return [];
  try {
    return JSON.parse(result);
  } catch {
    return [];
  }
}

function checkPRHealth(pr) {
  const checks = pr.statusCheckRollup || [];
  const passing = checks.filter(
    (c) => c.conclusion === 'SUCCESS' || (c.status === 'COMPLETED' && c.conclusion === 'SUCCESS'),
  );
  const failing = checks.filter((c) => c.conclusion === 'FAILURE');
  const pending = checks.filter(
    (c) => c.status === 'IN_PROGRESS' || c.status === 'QUEUED' || !c.conclusion,
  );

  const ageHours = (Date.now() - new Date(pr.updatedAt).getTime()) / 3600000;
  const isStale = ageHours > staleHours;
  const isFleet =
    pr.headRefName.startsWith('wt-') ||
    pr.headRefName.includes('feat/') ||
    pr.headRefName.includes('fix/') ||
    pr.headRefName.includes('ci/');

  let status = 'healthy';
  if (failing.length > 0) status = 'failing';
  else if (pending.length > 0) status = 'pending';
  else if (pr.mergeable === 'CONFLICTING') status = 'conflict';
  else if (isStale) status = 'stale';

  return {
    number: pr.number,
    title: pr.title,
    branch: pr.headRefName,
    author: pr.author ? pr.author.login : 'unknown',
    isDraft: pr.isDraft,
    isFleet,
    status,
    checks: { passing: passing.length, failing: failing.length, pending: pending.length },
    ageHours: Math.round(ageHours),
    isStale,
    mergeable: pr.mergeable,
  };
}

function displayStatus() {
  const prs = getOpenPRs();
  if (prs.length === 0) {
    console.log(`\n  ${PASS} No open PRs.`);
    return [];
  }

  const health = prs.map(checkPRHealth);

  console.log(fmt.bold('\n\uD83D\uDE80 Open PRs'));
  console.log('\u2500'.repeat(70));

  for (const pr of health) {
    const icon =
      pr.status === 'healthy'
        ? '\uD83D\uDFE2'
        : pr.status === 'failing'
          ? '\uD83D\uDD34'
          : pr.status === 'pending'
            ? '\uD83D\uDFE1'
            : pr.status === 'conflict'
              ? '\uD83D\uDFE0'
              : '\u26AA';
    const draft = pr.isDraft ? ' [DRAFT]' : '';
    const stale = pr.isStale ? ` ${WARN} STALE (${pr.ageHours}h)` : '';
    const conflict = pr.mergeable === 'CONFLICTING' ? ` ${FAIL} CONFLICT` : '';

    console.log(`  ${icon} #${pr.number} ${pr.title}${draft}${stale}${conflict}`);
    console.log(
      `    ${fmt.dim(`Branch: ${pr.branch} | Author: ${pr.author} | Checks: ${pr.checks.passing}\u2705 ${pr.checks.failing}\u274C ${pr.checks.pending}\u23F3`)}`,
    );
  }

  // Summary
  const failing = health.filter((p) => p.status === 'failing');
  const conflicts = health.filter((p) => p.mergeable === 'CONFLICTING');
  const stale = health.filter((p) => p.isStale);

  console.log('\n' + '\u2500'.repeat(70));
  console.log(fmt.bold('  Summary'));
  console.log(
    `    Total: ${health.length} | Healthy: ${health.filter((p) => p.status === 'healthy').length} | Failing: ${failing.length} | Conflicts: ${conflicts.length} | Stale: ${stale.length}`,
  );

  if (failing.length > 0) {
    console.log(fmt.bold('\n  \uD83D\uDEA8 Action Required'));
    for (const pr of failing) {
      console.log(
        `    ${FAIL} #${pr.number}: ${pr.checks.failing} failing check(s) - run "gh pr checks ${pr.number}"`,
      );
    }
  }

  if (conflicts.length > 0) {
    console.log(fmt.bold('\n  \u26A0\uFE0F Merge Conflicts'));
    for (const pr of conflicts) {
      console.log(
        `    ${WARN} #${pr.number}: needs rebase - "git fetch && git rebase origin/main"`,
      );
    }
  }

  return health;
}

function main() {
  console.log('');
  console.log(fmt.bold('\uD83D\uDCE1 Finance - Fleet Status'));
  console.log('\u2550'.repeat(70));
  console.log(`  Stale threshold: ${staleHours}h`);

  if (!run('gh --version')) {
    console.log(`\n  ${FAIL} gh CLI not found. Install: https://cli.github.com/`);
    process.exit(2);
  }

  const health = displayStatus();

  if (doJson) {
    console.log('\n--- FLEET_STATUS_JSON ---');
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), prs: health }, null, 2));
    console.log('--- END_FLEET_STATUS_JSON ---');
  }

  if (doWatch) {
    console.log(`\n  ${fmt.dim('Watching... (Ctrl+C to stop)')}`);
    setInterval(() => {
      console.clear();
      console.log(fmt.bold('\uD83D\uDCE1 Finance - Fleet Status (watching)'));
      console.log('\u2550'.repeat(70));
      displayStatus();
    }, 60000);
  }
}

main();
