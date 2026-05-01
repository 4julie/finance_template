#!/usr/bin/env node
/**
 * Worktree Cleanup - Enhanced stale worktree removal with PR status checks.
 *
 * Usage:
 *   node tools/worktree-cleanup.js             # Dry run
 *   node tools/worktree-cleanup.js --force      # Remove stale worktrees
 *   node tools/worktree-cleanup.js --help       # Show usage
 *
 * Detects: merged branches, deleted remote branches, closed PRs, stale (>7d).
 * Requires: gh CLI for PR status checks.
 * Issue: #sprint-10
 */
const { execSync } = require('child_process');
const { resolve } = require('path');
const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(
    'Worktree Cleanup - node tools/worktree-cleanup.js [--force] [--stale-days N] [--json]',
  );
  process.exit(0);
}
const forceRemove = args.includes('--force');
const staleDays = args.includes('--stale-days')
  ? parseInt(args[args.indexOf('--stale-days') + 1], 10)
  : 7;
const doJson = args.includes('--json');
const sc = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = {
  bold: (s) => (sc ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s) => (sc ? `\x1b[2m${s}\x1b[0m` : s),
};
function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe', timeout: 15000 }).trim();
  } catch {
    return null;
  }
}
function getWorktrees() {
  const out = run('git worktree list --porcelain');
  if (!out) return [];
  const wts = [];
  let cur = {};
  for (const l of out.split('\n')) {
    if (l.startsWith('worktree ')) {
      if (cur.path) wts.push(cur);
      cur = { path: l.slice(9) };
    } else if (l.startsWith('HEAD ')) cur.head = l.slice(5);
    else if (l.startsWith('branch ')) cur.branch = l.replace('branch refs/heads/', '');
    else if (l === 'bare') cur.bare = true;
    else if (l === 'detached') cur.detached = true;
  }
  if (cur.path) wts.push(cur);
  return wts;
}
function isMerged(branch) {
  const r = run(`git branch --merged main --list "${branch}"`);
  return r && r.includes(branch);
}
function remoteExists(branch) {
  const r = run(`git ls-remote --heads origin "${branch}"`);
  return r && r.length > 0;
}
function lastCommitAge(branch) {
  const d = run(`git log -1 --format=%ci "${branch}"`);
  return d ? (Date.now() - new Date(d).getTime()) / 86400000 : Infinity;
}
function prStatus(branch) {
  const r = run(`gh pr list --head="${branch}" --state=all --json=number,state --limit=1`);
  if (!r) return null;
  try {
    const p = JSON.parse(r);
    return p[0] || null;
  } catch {
    return null;
  }
}
function main() {
  console.log(fmt.bold('\n\uD83E\uDDF9 Finance - Worktree Cleanup'));
  console.log('\u2550'.repeat(60));
  console.log(`  Mode: ${forceRemove ? 'FORCE' : 'dry run'} | Stale: ${staleDays}d`);
  const wts = getWorktrees();
  const candidates = wts.filter((w) => w.branch !== 'main' && !w.bare);
  if (!candidates.length) {
    console.log('\n  \u2705 No worktrees to clean.');
    return;
  }
  console.log(`\n  Found ${candidates.length} worktree(s):\n`);
  const toRemove = [],
    toKeep = [];
  for (const wt of candidates) {
    let reason = null,
      status = 'keep';
    if (wt.branch && isMerged(wt.branch)) {
      reason = 'merged to main';
      status = 'remove';
    } else if (wt.branch && !remoteExists(wt.branch)) {
      reason = 'branch deleted from remote';
      status = 'remove';
    } else if (wt.branch) {
      const pr = prStatus(wt.branch);
      if (pr && (pr.state === 'MERGED' || pr.state === 'CLOSED')) {
        reason = `PR #${pr.number} ${pr.state.toLowerCase()}`;
        status = 'remove';
      }
    }
    if (status === 'keep' && wt.branch) {
      const age = lastCommitAge(wt.branch);
      if (age > staleDays) {
        reason = `${Math.round(age)}d inactive`;
        status = 'stale';
      }
    }
    const icon = status === 'keep' ? '\u2705' : status === 'remove' ? '\u274C' : '\u26A0\uFE0F';
    console.log(`  ${icon} ${wt.path}`);
    console.log(`    ${fmt.dim(`${wt.branch || '(detached)'} | ${reason || 'active'}`)}`);
    if (status !== 'keep') toRemove.push({ ...wt, reason });
    else toKeep.push(wt);
  }
  console.log(`\n  Keep: ${toKeep.length} | Remove: ${toRemove.length}`);
  if (toRemove.length && forceRemove) {
    console.log(fmt.bold('\n  Removing...'));
    for (const wt of toRemove) {
      const r = run(`git worktree remove "${wt.path}" --force`);
      console.log(`    ${r !== null ? '\u2705' : '\u274C'} ${wt.path}`);
    }
  } else if (toRemove.length) {
    console.log('\n  Run with --force to remove.');
  }
  if (doJson)
    console.log(
      '\n' +
        JSON.stringify(
          { timestamp: new Date().toISOString(), keep: toKeep, remove: toRemove },
          null,
          2,
        ),
    );
}
main();
