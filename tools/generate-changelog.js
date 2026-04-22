#!/usr/bin/env node
// SPDX-License-Identifier: BUSL-1.1

// =============================================================================
// Changelog Generator — Structured release notes from conventional commits
// =============================================================================
//
// Usage:
//   node tools/generate-changelog.js                    # auto-detect latest tag range
//   node tools/generate-changelog.js v1.0.0 v1.1.0     # explicit range
//   node tools/generate-changelog.js --from <tag>       # from tag to HEAD
//
// Parses conventional commit messages (feat, fix, perf, etc.) and generates
// a categorized, Markdown-formatted changelog with PR links, issue cross-
// references, platform grouping, diff stats, and contributor attribution.
//
// Enhancements (Issue #1014):
//   - Issue linking from commit bodies (Closes #N, Fixes #N, Resolves #N)
//   - PR ↔ issue cross-references
//   - Platform scope grouping (android, ios, web, windows, core)
//   - Diff stats summary (files changed, insertions, deletions)
//   - --format flag for markdown/json output
//   - Non-conforming commit warnings on stderr
//
// Issues: #962, #1014
// =============================================================================

const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── CLI flags ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Changelog Generator — Structured release notes from conventional commits

Usage:
  node tools/generate-changelog.js                      # auto-detect tag range
  node tools/generate-changelog.js v1.0.0 v1.1.0       # explicit range
  node tools/generate-changelog.js --from v1.0.0        # from tag to HEAD

Options:
  --from <tag>         Start tag (end defaults to HEAD)
  --to <tag>           End tag (defaults to HEAD)
  --repo <owner/repo>  GitHub repo for PR links (default: auto-detect)
  --format <fmt>       Output format: markdown (default), json
  --group-by-platform  Group changes by platform scope
  --include-stats      Include diff stats (files changed, LoC)
  --warn-nonconforming Warn on non-conventional commits (to stderr)
  --help, -h           Show this help
`);
  process.exit(0);
}

/**
 * Read a CLI flag value.
 * @param {string} flag
 * @returns {string|undefined}
 */
function getFlag(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const outputFormat = getFlag('--format') || 'markdown';
const groupByPlatform = args.includes('--group-by-platform');
const includeStats = args.includes('--include-stats');
const warnNonconforming = args.includes('--warn-nonconforming');

// ── Git helpers ──────────────────────────────────────────────────────────────

/**
 * @param {string[]} gitArgs
 * @returns {string}
 */
function git(gitArgs) {
  try {
    return execFileSync('git', gitArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 10 * 1024 * 1024,
    }).trim();
  } catch {
    return '';
  }
}

/**
 * Detect GitHub repo from git remote.
 * @returns {string} e.g. "jrmoulckers/finance"
 */
function detectRepo() {
  const fromArg = getFlag('--repo');
  if (fromArg) return fromArg;

  const remoteUrl = git(['remote', 'get-url', 'origin']);
  const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/);
  return match ? match[1] : '';
}

/**
 * Get the two most recent tags sorted by version.
 * @returns {{ from: string; to: string }}
 */
function detectTagRange() {
  const fromIdx = args.indexOf('--from');
  const toIdx = args.indexOf('--to');

  if (fromIdx !== -1) {
    const from = args[fromIdx + 1];
    const to = toIdx !== -1 ? args[toIdx + 1] : 'HEAD';
    return { from, to };
  }

  // Positional args: <from> <to>
  if (args.length >= 2 && !args[0].startsWith('-') && !args[1].startsWith('-')) {
    return { from: args[0], to: args[1] };
  }

  // Auto-detect: latest two tags
  const tags = git(['tag', '--sort=-version:refname', '--list', 'v*']).split('\n').filter(Boolean);

  if (tags.length >= 2) {
    return { from: tags[1], to: tags[0] };
  }
  if (tags.length === 1) {
    return { from: '', to: tags[0] };
  }

  return { from: '', to: 'HEAD' };
}

// ── Commit parsing ───────────────────────────────────────────────────────────

/**
 * @typedef {{ type: string; scope: string; subject: string; hash: string; author: string; prNumber: string; breaking: boolean; issueNumbers: string[]; platform: string; body: string }} ParsedCommit
 */

const COMMIT_PATTERN =
  /^(?<type>feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert)(?:\((?<scope>[^)]+)\))?(?<bang>!)?:\s*(?<subject>.+)$/;

// Issue reference patterns (Closes #N, Fixes #N, Resolves #N, refs #N)
const ISSUE_REF_PATTERN = /(?:closes?|fixes?|resolves?|refs?)\s+#(\d+)/gi;

// Platform scope mappings
const PLATFORM_SCOPES = {
  android: ['android', 'droid', 'apk', 'aab', 'play-store'],
  ios: ['ios', 'ipad', 'macos', 'watchos', 'xcode', 'swift', 'siri'],
  web: ['web', 'pwa', 'vite', 'playwright', 'lighthouse'],
  windows: ['windows', 'win', 'msix', 'winui', 'narrator'],
  core: ['core', 'models', 'sync', 'kmp', 'shared', 'kotlin'],
  backend: ['backend', 'api', 'server', 'docker', 'supabase', 'powersync'],
  ci: ['ci', 'cd', 'workflows', 'github-actions', 'deploy'],
};

/**
 * Detect platform from commit scope.
 * @param {string} scope
 * @returns {string}
 */
function detectPlatform(scope) {
  const lower = scope.toLowerCase();
  for (const [platform, keywords] of Object.entries(PLATFORM_SCOPES)) {
    if (keywords.some((k) => lower.includes(k))) {
      return platform;
    }
  }
  return 'other';
}

/**
 * Extract issue numbers from commit body.
 * @param {string} body
 * @returns {string[]}
 */
function extractIssueRefs(body) {
  const refs = [];
  let match;
  const pattern = new RegExp(ISSUE_REF_PATTERN.source, 'gi');
  while ((match = pattern.exec(body)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

/**
 * Parse a single conventional commit message.
 * @param {string} line  Format: "hash|author|subject"
 * @param {string} body  Full commit body (may be empty)
 * @returns {ParsedCommit | null}
 */
function parseCommit(line, body) {
  const [hash, author, ...rest] = line.split('|');
  const subject = rest.join('|'); // subject may contain |

  if (!hash || !subject) return null;

  const match = subject.match(COMMIT_PATTERN);
  if (!match || !match.groups) {
    if (warnNonconforming) {
      process.stderr.write(`⚠️  Non-conforming commit: ${hash.slice(0, 7)} ${subject}\n`);
    }
    return null;
  }

  // Extract PR number from subject like "... (#123)"
  const prMatch = subject.match(/\(#(\d+)\)\s*$/);
  const prNumber = prMatch ? prMatch[1] : '';

  // Extract issue references from subject and body
  const allText = subject + '\n' + (body || '');
  const issueNumbers = extractIssueRefs(allText);

  // Also extract issue numbers from subject like "(#123, #456)"
  const subjectIssues = subject.match(/#(\d+)/g);
  if (subjectIssues) {
    for (const si of subjectIssues) {
      const num = si.replace('#', '');
      if (num !== prNumber && !issueNumbers.includes(num)) {
        issueNumbers.push(num);
      }
    }
  }

  const scope = match.groups.scope || '';

  return {
    type: match.groups.type,
    scope,
    subject: subject
      .replace(COMMIT_PATTERN, '$<subject>')
      .replace(/\s*\(#\d+\)\s*$/, '')
      .trim(),
    hash: hash.slice(0, 7),
    author: author.trim(),
    prNumber,
    breaking: !!match.groups.bang,
    issueNumbers,
    platform: detectPlatform(scope),
    body: body || '',
  };
}

// ── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES = [
  { type: 'feat', emoji: '🚀', heading: 'Features' },
  { type: 'fix', emoji: '🐛', heading: 'Bug Fixes' },
  { type: 'perf', emoji: '⚡', heading: 'Performance' },
  { type: 'refactor', emoji: '♻️', heading: 'Refactoring' },
  { type: 'docs', emoji: '📝', heading: 'Documentation' },
  { type: 'ci', emoji: '🔧', heading: 'CI/CD' },
  { type: 'build', emoji: '📦', heading: 'Build' },
  { type: 'test', emoji: '✅', heading: 'Tests' },
  { type: 'style', emoji: '🎨', heading: 'Style' },
  { type: 'chore', emoji: '🏗️', heading: 'Chores' },
  { type: 'revert', emoji: '⏪', heading: 'Reverts' },
];

const PLATFORM_LABELS = {
  android: '🤖 Android',
  ios: '🍎 iOS',
  web: '🌐 Web',
  windows: '🪟 Windows',
  core: '📦 Core/Shared',
  backend: '🔧 Backend',
  ci: '⚙️ CI/CD',
  other: '📋 Other',
};

// ── Changelog generation ─────────────────────────────────────────────────────

const repo = detectRepo();
const { from, to } = detectTagRange();

const logRange = from ? `${from}..${to}` : to;
const logFormat = '%h|%an|%s';

// Get commit subjects
const rawLog = git(['log', '--pretty=format:' + logFormat, '--no-merges', logRange]);
const lines = rawLog ? rawLog.split('\n').filter(Boolean) : [];

// Get commit bodies for issue reference extraction
const bodyFormat = '---COMMIT_BOUNDARY---%h%n%b';
const rawBodies = git(['log', '--pretty=format:' + bodyFormat, '--no-merges', logRange]);
const bodyMap = new Map();
if (rawBodies) {
  const bodyEntries = rawBodies.split('---COMMIT_BOUNDARY---').filter(Boolean);
  for (const entry of bodyEntries) {
    const newlineIdx = entry.indexOf('\n');
    if (newlineIdx !== -1) {
      const hash = entry.slice(0, newlineIdx).trim();
      const body = entry.slice(newlineIdx + 1).trim();
      bodyMap.set(hash.slice(0, 7), body);
    }
  }
}

// Parse all commits
const commits = lines
  .map((line) => {
    const hash = line.split('|')[0]?.slice(0, 7);
    return parseCommit(line, bodyMap.get(hash) || '');
  })
  .filter(Boolean);

// Count non-conforming commits
const nonConformingCount = lines.length - commits.length;

// Group by category
/** @type {Map<string, ParsedCommit[]>} */
const grouped = new Map();
const breakingChanges = [];

for (const commit of commits) {
  if (commit.breaking) {
    breakingChanges.push(commit);
  }

  const category = CATEGORIES.find((c) => c.type === commit.type);
  if (category) {
    if (!grouped.has(commit.type)) grouped.set(commit.type, []);
    grouped.get(commit.type).push(commit);
  }
}

// Group by platform
/** @type {Map<string, ParsedCommit[]>} */
const byPlatform = new Map();
for (const commit of commits) {
  const plat = commit.platform;
  if (!byPlatform.has(plat)) byPlatform.set(plat, []);
  byPlatform.get(plat).push(commit);
}

// Collect unique contributors
const contributors = [...new Set(commits.map((c) => c.author))].sort();

// Collect all issue references
const allIssueRefs = [...new Set(commits.flatMap((c) => c.issueNumbers))].sort(
  (a, b) => Number(a) - Number(b),
);

// ── Diff stats ───────────────────────────────────────────────────────────────

let diffStats = null;
if (includeStats && from) {
  const statLine = git(['diff', '--stat', `${from}..${to}`]);
  const summaryMatch = statLine.match(
    /(\d+)\s+files?\s+changed(?:,\s+(\d+)\s+insertions?)?(?:,\s+(\d+)\s+deletions?)?/,
  );
  if (summaryMatch) {
    diffStats = {
      filesChanged: parseInt(summaryMatch[1], 10) || 0,
      insertions: parseInt(summaryMatch[2], 10) || 0,
      deletions: parseInt(summaryMatch[3], 10) || 0,
    };
  }
}

// ── JSON output ──────────────────────────────────────────────────────────────

if (outputFormat === 'json') {
  const jsonOutput = {
    version: to === 'HEAD' ? 'unreleased' : to,
    date: new Date().toISOString().split('T')[0],
    range: { from, to },
    repo,
    breakingChanges: breakingChanges.map((c) => ({
      scope: c.scope,
      subject: c.subject,
      hash: c.hash,
      pr: c.prNumber,
      issues: c.issueNumbers,
    })),
    categories: {},
    platforms: {},
    stats: {
      totalCommits: commits.length,
      totalPRs: commits.filter((c) => c.prNumber).length,
      nonConforming: nonConformingCount,
      contributors: contributors.length,
      issuesReferenced: allIssueRefs.length,
      diff: diffStats,
    },
    contributors,
    issuesReferenced: allIssueRefs,
  };

  for (const cat of CATEGORIES) {
    const items = grouped.get(cat.type);
    if (items && items.length > 0) {
      jsonOutput.categories[cat.type] = items.map((c) => ({
        scope: c.scope,
        subject: c.subject,
        hash: c.hash,
        author: c.author,
        pr: c.prNumber,
        issues: c.issueNumbers,
        platform: c.platform,
      }));
    }
  }

  for (const [plat, items] of byPlatform) {
    jsonOutput.platforms[plat] = items.length;
  }

  process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
  process.exit(0);
}

// ── Render Markdown ──────────────────────────────────────────────────────────

/**
 * Format a single commit line with issue cross-references.
 * @param {ParsedCommit} c
 * @returns {string}
 */
function formatCommit(c) {
  const scope = c.scope ? `**${c.scope}:** ` : '';
  const pr =
    c.prNumber && repo ? ` ([#${c.prNumber}](https://github.com/${repo}/pull/${c.prNumber}))` : '';
  const hashLink = repo
    ? ` ([${c.hash}](https://github.com/${repo}/commit/${c.hash}))`
    : ` (${c.hash})`;

  // Add issue cross-references
  let issueLinks = '';
  if (c.issueNumbers.length > 0 && repo) {
    const refs = c.issueNumbers
      .filter((n) => n !== c.prNumber) // don't duplicate PR link
      .map((n) => `[#${n}](https://github.com/${repo}/issues/${n})`);
    if (refs.length > 0) {
      issueLinks = ` — closes ${refs.join(', ')}`;
    }
  }

  return `- ${scope}${c.subject}${pr}${hashLink}${issueLinks}`;
}

const output = [];

// Header
const tagDisplay = to === 'HEAD' ? 'Unreleased' : to;
const dateStr = new Date().toISOString().split('T')[0];
output.push(`## ${tagDisplay} (${dateStr})\n`);

// Breaking changes
if (breakingChanges.length > 0) {
  output.push('### ⚠️ Breaking Changes\n');
  for (const c of breakingChanges) {
    output.push(formatCommit(c));
  }
  output.push('');
}

// Platform grouping mode
if (groupByPlatform) {
  const platformOrder = ['core', 'android', 'ios', 'web', 'windows', 'backend', 'ci', 'other'];

  for (const plat of platformOrder) {
    const items = byPlatform.get(plat);
    if (!items || items.length === 0) continue;

    const label = PLATFORM_LABELS[plat] || plat;
    output.push(`### ${label}\n`);

    // Sub-group by type within platform
    for (const cat of CATEGORIES) {
      const typeItems = items.filter((c) => c.type === cat.type);
      if (typeItems.length === 0) continue;

      output.push(`#### ${cat.emoji} ${cat.heading}\n`);
      for (const c of typeItems) {
        output.push(formatCommit(c));
      }
      output.push('');
    }
  }
} else {
  // Standard category grouping
  for (const cat of CATEGORIES) {
    const items = grouped.get(cat.type);
    if (!items || items.length === 0) continue;

    output.push(`### ${cat.emoji} ${cat.heading}\n`);

    // Sub-group by scope
    const byScope = new Map();
    for (const item of items) {
      const key = item.scope || '_none';
      if (!byScope.has(key)) byScope.set(key, []);
      byScope.get(key).push(item);
    }

    // Sort scopes alphabetically (unsorted at end)
    const scopes = [...byScope.keys()].sort((a, b) => {
      if (a === '_none') return 1;
      if (b === '_none') return -1;
      return a.localeCompare(b);
    });

    for (const scope of scopes) {
      for (const c of byScope.get(scope)) {
        output.push(formatCommit(c));
      }
    }
    output.push('');
  }
}

// Diff stats
if (diffStats) {
  output.push('### 📈 Diff Stats\n');
  output.push(
    `- **${diffStats.filesChanged}** files changed, **${diffStats.insertions}** insertions(+), **${diffStats.deletions}** deletions(-)`,
  );
  output.push('');
}

// Issue cross-reference summary
if (allIssueRefs.length > 0 && repo) {
  output.push('### 🔗 Issues Referenced\n');
  const issueLinks = allIssueRefs.map((n) => `[#${n}](https://github.com/${repo}/issues/${n})`);
  output.push(issueLinks.join(' · '));
  output.push('');
}

// Statistics
const totalCommits = commits.length;
const totalPRs = commits.filter((c) => c.prNumber).length;

output.push('### 📊 Statistics\n');
output.push(`- **${totalCommits}** commits from **${contributors.length}** contributor(s)`);
if (totalPRs > 0) {
  output.push(`- **${totalPRs}** pull request(s) merged`);
}
if (allIssueRefs.length > 0) {
  output.push(`- **${allIssueRefs.length}** issue(s) referenced`);
}
if (nonConformingCount > 0) {
  output.push(`- **${nonConformingCount}** non-conforming commit(s) excluded`);
}
if (from) {
  output.push(`- Comparing: \`${from}...${to}\``);
}

// Platform breakdown
if (byPlatform.size > 1) {
  output.push('');
  output.push('**Platform breakdown:**');
  const platformOrder = ['core', 'android', 'ios', 'web', 'windows', 'backend', 'ci', 'other'];
  for (const plat of platformOrder) {
    const items = byPlatform.get(plat);
    if (items && items.length > 0) {
      const label = PLATFORM_LABELS[plat] || plat;
      output.push(`- ${label}: ${items.length} change(s)`);
    }
  }
}

output.push('');

// Contributors
if (contributors.length > 0) {
  output.push('### 👥 Contributors\n');
  output.push(contributors.map((c) => `- ${c}`).join('\n'));
  output.push('');
}

const changelog = output.join('\n');
process.stdout.write(changelog);
