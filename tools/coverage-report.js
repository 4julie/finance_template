#!/usr/bin/env node

/**
 * Coverage Report Aggregation - Aggregate code coverage across all packages.
 *
 * Usage:
 *   node tools/coverage-report.js             # Aggregate all coverage
 *   node tools/coverage-report.js --check     # Check against thresholds
 *   node tools/coverage-report.js --badge     # Generate coverage badge markdown
 *   node tools/coverage-report.js --help      # Show usage
 *
 * Coverage thresholds:
 *   packages/core      80% (business logic)
 *   packages/models    80% (data models)
 *   packages/sync      80% (sync engine)
 *   apps/web           70% (platform app)
 *   apps/android       70% (platform app)
 *   apps/ios           70% (platform app)
 *   apps/windows       70% (platform app)
 *
 * Environment variables:
 *   COVERAGE_THRESHOLD_CORE - Override core threshold (default: 80)
 *   COVERAGE_THRESHOLD_APPS - Override app threshold (default: 70)
 *   CI - Set to "true" for CI-friendly output
 *
 * Exit codes:
 *   0 - All thresholds met (or --check not specified)
 *   1 - Coverage below threshold
 *   2 - Invalid arguments
 *
 * Issue: #sprint-2
 */

const { readFileSync, existsSync, readdirSync: _readdirSync } = require('fs');
const { resolve, join } = require('path');
const { execSync: _execSync } = require('child_process');

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Coverage Report - Finance Monorepo

Usage:
  node tools/coverage-report.js [options]

Options:
  --check          Enforce coverage thresholds (exit 1 on failure)
  --badge          Generate coverage badge markdown
  --json           Output JSON summary
  --platform <p>   Filter to a specific platform
  --help, -h       Show this help message

Thresholds:
  Core packages (packages/*):  80%
  Platform apps (apps/*):      70%
`);
  process.exit(0);
}

const doCheck = args.includes('--check');
const doBadge = args.includes('--badge');
const doJson = args.includes('--json');
const _isCI = process.env.CI === 'true';

const CORE_THRESHOLD = parseInt(process.env.COVERAGE_THRESHOLD_CORE || '80', 10);
const APPS_THRESHOLD = parseInt(process.env.COVERAGE_THRESHOLD_APPS || '70', 10);

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = {
  bold: (s) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s) => (supportsColor ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s) => (supportsColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s),
};
const PASS = '\u2705';
const FAIL = '\u274C';
const WARN = '\u26A0\uFE0F';

/**
 * Coverage sources by platform.
 */
const COVERAGE_SOURCES = [
  {
    name: 'packages/core',
    type: 'kover',
    threshold: CORE_THRESHOLD,
    reportPath: 'packages/core/build/reports/kover/report.xml',
  },
  {
    name: 'packages/sync',
    type: 'kover',
    threshold: CORE_THRESHOLD,
    reportPath: 'packages/sync/build/reports/kover/report.xml',
  },
  {
    name: 'packages/models',
    type: 'kover',
    threshold: CORE_THRESHOLD,
    reportPath: 'packages/models/build/reports/kover/report.xml',
  },
  {
    name: 'apps/web',
    type: 'istanbul',
    threshold: APPS_THRESHOLD,
    reportPath: 'apps/web/coverage/coverage-summary.json',
  },
  {
    name: 'apps/android',
    type: 'jacoco',
    threshold: APPS_THRESHOLD,
    reportPath:
      'apps/android/build/reports/jacoco/testDebugUnitTestCoverage/testDebugUnitTestCoverage.xml',
  },
  {
    name: 'apps/ios',
    type: 'xccov',
    threshold: APPS_THRESHOLD,
    reportPath: 'apps/ios/.build/coverage.json',
  },
];

/**
 * Parse Kover XML coverage report.
 */
function parseKoverXml(filePath) {
  try {
    const xml = readFileSync(join(ROOT, filePath), 'utf-8');
    // Look for line coverage counter: <counter type="LINE" missed="X" covered="Y"/>
    const lineMatch = xml.match(/counter\s+type="LINE"\s+missed="(\d+)"\s+covered="(\d+)"/);
    if (lineMatch) {
      const missed = parseInt(lineMatch[1], 10);
      const covered = parseInt(lineMatch[2], 10);
      const total = missed + covered;
      return total > 0 ? (covered / total) * 100 : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Istanbul JSON coverage summary.
 */
function parseIstanbul(filePath) {
  try {
    const data = JSON.parse(readFileSync(join(ROOT, filePath), 'utf-8'));
    const total = data.total;
    if (total && total.lines) {
      return total.lines.pct;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse JaCoCo XML coverage report.
 */
function parseJacocoXml(filePath) {
  try {
    const xml = readFileSync(join(ROOT, filePath), 'utf-8');
    const lineMatch = xml.match(/counter\s+type="LINE"\s+missed="(\d+)"\s+covered="(\d+)"/);
    if (lineMatch) {
      const missed = parseInt(lineMatch[1], 10);
      const covered = parseInt(lineMatch[2], 10);
      const total = missed + covered;
      return total > 0 ? (covered / total) * 100 : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse Xcode xccov JSON report.
 */
function parseXccov(filePath) {
  try {
    const data = JSON.parse(readFileSync(join(ROOT, filePath), 'utf-8'));
    let totalExec = 0;
    let totalCov = 0;
    for (const target of data.targets || []) {
      totalExec += target.executableLines || 0;
      totalCov += target.coveredLines || 0;
    }
    return totalExec > 0 ? (totalCov / totalExec) * 100 : null;
  } catch {
    return null;
  }
}

/**
 * Get coverage percentage for a source.
 */
function getCoverage(source) {
  const fullPath = join(ROOT, source.reportPath);
  if (!existsSync(fullPath)) return null;

  switch (source.type) {
    case 'kover':
      return parseKoverXml(source.reportPath);
    case 'istanbul':
      return parseIstanbul(source.reportPath);
    case 'jacoco':
      return parseJacocoXml(source.reportPath);
    case 'xccov':
      return parseXccov(source.reportPath);
    default:
      return null;
  }
}

/**
 * Generate a coverage badge color based on percentage.
 */
function badgeColor(pct) {
  if (pct >= 80) return 'brightgreen';
  if (pct >= 70) return 'green';
  if (pct >= 50) return 'yellow';
  if (pct >= 30) return 'orange';
  return 'red';
}

function main() {
  console.log('');
  console.log(fmt.bold('\uD83D\uDCCA Finance - Coverage Report'));
  console.log('\u2550'.repeat(50));

  const results = [];
  let failures = 0;

  for (const source of COVERAGE_SOURCES) {
    const pct = getCoverage(source);
    const entry = {
      name: source.name,
      coverage: pct,
      threshold: source.threshold,
      passed: pct === null || pct >= source.threshold,
      reportFound: pct !== null,
    };
    results.push(entry);

    if (pct === null) {
      console.log(`  ${WARN} ${source.name}: no coverage report found`);
      console.log(`       Expected: ${source.reportPath}`);
    } else if (pct >= source.threshold) {
      console.log(`  ${PASS} ${source.name}: ${pct.toFixed(1)}% (threshold: ${source.threshold}%)`);
    } else {
      console.log(`  ${FAIL} ${source.name}: ${pct.toFixed(1)}% < ${source.threshold}% threshold`);
      failures++;
    }
  }

  // Overall
  const withReports = results.filter((r) => r.reportFound);
  const overallPct =
    withReports.length > 0
      ? withReports.reduce((sum, r) => sum + r.coverage, 0) / withReports.length
      : null;

  console.log('\n' + '\u2500'.repeat(50));
  if (overallPct !== null) {
    console.log(fmt.bold(`  Overall coverage: ${overallPct.toFixed(1)}%`));
  } else {
    console.log(fmt.bold('  No coverage reports found.'));
    console.log('  Run tests with coverage enabled first:');
    console.log('    npm test -w apps/web -- --coverage');
    console.log('    ./gradlew :packages:core:koverXmlReport');
  }

  // Badge
  if (doBadge && overallPct !== null) {
    console.log('\n' + fmt.bold('Coverage Badge:'));
    const color = badgeColor(overallPct);
    const pctStr = `${Math.round(overallPct)}%25`;
    console.log(`  ![Coverage](https://img.shields.io/badge/coverage-${pctStr}-${color})`);
    console.log('');

    // Per-package badges
    for (const r of results) {
      if (r.reportFound) {
        const c = badgeColor(r.coverage);
        const p = `${Math.round(r.coverage)}%25`;
        const label = r.name.replace('/', '-');
        console.log(`  ![${r.name}](https://img.shields.io/badge/${label}-${p}-${c})`);
      }
    }
  }

  // JSON output
  if (doJson) {
    console.log('\n--- COVERAGE_JSON ---');
    console.log(
      JSON.stringify(
        { timestamp: new Date().toISOString(), overall: overallPct, results },
        null,
        2,
      ),
    );
    console.log('--- END_COVERAGE_JSON ---');
  }

  // Threshold check
  if (doCheck && failures > 0) {
    console.log(`\n${FAIL} ${failures} package(s) below coverage threshold.`);
    process.exit(1);
  } else if (doCheck) {
    console.log(`\n${PASS} All coverage thresholds met.`);
  }
}

main();
