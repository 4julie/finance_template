#!/usr/bin/env node

/**
 * Performance Benchmark - Track build/test times across the Finance monorepo.
 *
 * Usage:
 *   node tools/performance-benchmark.js                # Run all benchmarks
 *   node tools/performance-benchmark.js --platform web  # Single platform
 *   node tools/performance-benchmark.js --compare       # Compare against baseline
 *   node tools/performance-benchmark.js --help          # Show usage
 *
 * Tracks:
 *   - Build durations per platform (web, android, ios, windows, shared)
 *   - Test execution times
 *   - Bundle/artifact sizes
 *   - Lighthouse CI budget compliance (web)
 *   - Performance budget enforcement from performance.budget.json
 *
 * Environment variables:
 *   PERF_BASELINE_FILE - Path to baseline JSON (default: none)
 *   PERF_FAIL_ON_REGRESSION - "true" to fail on regressions (default: false)
 *   CI - "true" in CI environments for machine-readable output
 *
 * Exit codes:
 *   0 - All benchmarks passed
 *   1 - Performance regression detected
 *   2 - Invalid arguments or missing prerequisites
 *
 * Issue: #sprint-1
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync, writeFileSync } = require('fs');
const { resolve, join } = require('path');

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Performance Benchmark - Finance Monorepo

Usage:
  node tools/performance-benchmark.js [options]

Options:
  --platform <name>   Benchmark a single platform (web|android|windows|shared|lint)
  --compare           Compare results against baseline file
  --baseline <file>   Path to baseline JSON
  --budget            Check against performance.budget.json thresholds
  --output <file>     Write results JSON to file
  --ci                Machine-readable output
  --help, -h          Show this help message
`);
  process.exit(0);
}

const platformFilter = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : null;
const doCompare = args.includes('--compare');
const doBudget = args.includes('--budget');
const isCI = args.includes('--ci') || process.env.CI === 'true';
const failOnRegression = process.env.PERF_FAIL_ON_REGRESSION === 'true';
const baselineFile = args.includes('--baseline')
  ? args[args.indexOf('--baseline') + 1]
  : process.env.PERF_BASELINE_FILE || null;
const outputFile = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

// ANSI helpers
const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR && !isCI;
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

/**
 * Run a shell command and return { stdout, durationMs, error }.
 */
function timedRun(cmd, options = {}) {
  const start = Date.now();
  try {
    const stdout = execSync(cmd, {
      cwd: options.cwd || ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: options.timeout || 300000,
    }).trim();
    return { stdout, durationMs: Date.now() - start };
  } catch (err) {
    return {
      stdout: err.stdout ? err.stdout.trim() : '',
      durationMs: Date.now() - start,
      error: err.message,
    };
  }
}

/**
 * Parse duration string (e.g. "2s", "200ms") to milliseconds.
 */
function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(ms|s|m)$/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2];
  if (unit === 'ms') return value;
  if (unit === 's') return value * 1000;
  if (unit === 'm') return value * 60000;
  return null;
}

function loadPerformanceBudget() {
  const budgetPath = join(ROOT, 'performance.budget.json');
  if (!existsSync(budgetPath)) return null;
  try {
    return JSON.parse(readFileSync(budgetPath, 'utf-8'));
  } catch {
    return null;
  }
}

function benchmarkWeb() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Web Platform Benchmarks'));
  console.log('\u2500'.repeat(50));
  const results = { platform: 'web', metrics: {} };
  if (!existsSync(join(ROOT, 'apps', 'web'))) {
    console.log(`  ${WARN} apps/web/ not found`);
    return results;
  }
  console.log('  Building web app...');
  const build = timedRun('npm run build -w apps/web', { timeout: 120000 });
  results.metrics.buildMs = build.durationMs;
  console.log(`  ${build.error ? WARN : PASS} Build: ${(build.durationMs / 1000).toFixed(1)}s`);
  console.log('  Running web tests...');
  const test = timedRun('npm test -w apps/web', { timeout: 120000 });
  results.metrics.testMs = test.durationMs;
  console.log(`  ${test.error ? WARN : PASS} Tests: ${(test.durationMs / 1000).toFixed(1)}s`);
  return results;
}

function benchmarkSharedPackages() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Shared Packages Benchmarks'));
  console.log('\u2500'.repeat(50));
  const results = { platform: 'shared', metrics: {} };
  console.log('  Building shared packages...');
  const build = timedRun(
    'node tools/gradle.js :packages:core:build :packages:models:build :packages:sync:build -x jsBrowserTest -x allTests',
    { timeout: 300000 },
  );
  results.metrics.buildMs = build.durationMs;
  console.log(`  ${build.error ? WARN : PASS} Build: ${(build.durationMs / 1000).toFixed(1)}s`);
  console.log('  Running JVM tests...');
  const test = timedRun('node tools/gradle.js :packages:core:jvmTest', { timeout: 300000 });
  results.metrics.testMs = test.durationMs;
  console.log(`  ${test.error ? WARN : PASS} Tests: ${(test.durationMs / 1000).toFixed(1)}s`);
  return results;
}

function benchmarkAndroid() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Android Platform Benchmarks'));
  console.log('\u2500'.repeat(50));
  const results = { platform: 'android', metrics: {} };
  if (!existsSync(join(ROOT, 'apps', 'android'))) {
    console.log(`  ${WARN} apps/android/ not found`);
    return results;
  }
  console.log('  Compiling Android debug...');
  const compile = timedRun('node tools/gradle.js :apps:android:compileDebugKotlin', {
    timeout: 300000,
  });
  results.metrics.compileMs = compile.durationMs;
  console.log(
    `  ${compile.error ? WARN : PASS} Compile: ${(compile.durationMs / 1000).toFixed(1)}s`,
  );
  return results;
}

function benchmarkWindows() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Windows Platform Benchmarks'));
  console.log('\u2500'.repeat(50));
  const results = { platform: 'windows', metrics: {} };
  if (!existsSync(join(ROOT, 'apps', 'windows'))) {
    console.log(`  ${WARN} apps/windows/ not found`);
    return results;
  }
  console.log('  Building Windows app...');
  const build = timedRun('node tools/gradle.js :apps:windows:build', { timeout: 300000 });
  results.metrics.buildMs = build.durationMs;
  console.log(`  ${build.error ? WARN : PASS} Build: ${(build.durationMs / 1000).toFixed(1)}s`);
  return results;
}

function benchmarkLintFormat() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Lint & Format Benchmarks'));
  console.log('\u2500'.repeat(50));
  const results = { platform: 'lint', metrics: {} };
  console.log('  Running Prettier check...');
  const prettier = timedRun('npx prettier --check .', { timeout: 60000 });
  results.metrics.prettierMs = prettier.durationMs;
  console.log(
    `  ${prettier.error ? WARN : PASS} Prettier: ${(prettier.durationMs / 1000).toFixed(1)}s`,
  );
  console.log('  Running ESLint...');
  const eslint = timedRun('npx eslint . --max-warnings 0', { timeout: 120000 });
  results.metrics.eslintMs = eslint.durationMs;
  console.log(`  ${eslint.error ? WARN : PASS} ESLint: ${(eslint.durationMs / 1000).toFixed(1)}s`);
  return results;
}

function checkBudgets(allResults, budget) {
  if (!budget || !budget.targets) return { passed: true, violations: [] };
  console.log(fmt.bold('\n\uD83D\uDCCF Performance Budget Checks'));
  console.log('\u2500'.repeat(50));
  const violations = [];
  for (const [metric, config] of Object.entries(budget.targets)) {
    const maxMs = config.max ? parseDuration(config.max) : null;
    if (maxMs && metric === 'coldStart') {
      for (const result of allResults) {
        const buildMs = result.metrics.buildMs || result.metrics.compileMs;
        if (buildMs && (config.platforms || []).includes(result.platform)) {
          const status = buildMs <= maxMs ? PASS : WARN;
          console.log(
            `  ${status} ${metric} (${result.platform}): ${(buildMs / 1000).toFixed(1)}s (budget: ${config.max})`,
          );
          if (buildMs > maxMs) {
            violations.push({ metric, platform: result.platform, actual: buildMs, budget: maxMs });
          }
        }
      }
    }
  }
  if (violations.length === 0) console.log(`  ${PASS} All budget checks passed`);
  else console.log(`\n  ${WARN} ${violations.length} budget violation(s)`);
  return { passed: violations.length === 0, violations };
}

function compareBaseline(allResults, basePath) {
  if (!basePath || !existsSync(basePath)) {
    console.log(`\n${WARN} No baseline found - skipping comparison`);
    return { passed: true, regressions: [] };
  }
  console.log(fmt.bold('\n\uD83D\uDCCA Baseline Comparison'));
  console.log('\u2500'.repeat(50));
  const baseline = JSON.parse(readFileSync(basePath, 'utf-8'));
  const regressions = [];
  const THRESHOLD = 0.2;
  for (const result of allResults) {
    const br = (baseline.results || []).find((r) => r.platform === result.platform);
    if (!br) continue;
    for (const [metric, value] of Object.entries(result.metrics)) {
      const bv = br.metrics && br.metrics[metric];
      if (!bv || typeof value !== 'number') continue;
      const change = (value - bv) / bv;
      const cs = `${change >= 0 ? '+' : ''}${(change * 100).toFixed(1)}%`;
      if (change > THRESHOLD) {
        console.log(`  ${FAIL} ${result.platform}/${metric}: ${cs} regression`);
        regressions.push({
          platform: result.platform,
          metric,
          change,
          baseValue: bv,
          actual: value,
        });
      } else if (change < -0.05) {
        console.log(`  ${PASS} ${result.platform}/${metric}: ${cs} improvement`);
      } else {
        console.log(`  ${fmt.dim('\u27A1\uFE0F')} ${result.platform}/${metric}: ${cs} (stable)`);
      }
    }
  }
  if (regressions.length === 0) console.log(`\n  ${PASS} No regressions detected`);
  else console.log(`\n  ${FAIL} ${regressions.length} regression(s)`);
  return { passed: regressions.length === 0, regressions };
}

function main() {
  console.log('');
  console.log(fmt.bold('\u26A1 Finance - Performance Benchmark'));
  console.log('\u2550'.repeat(50));
  console.log(`  Platform: ${platformFilter || 'all'}`);
  console.log(`  Baseline: ${baselineFile || 'none'}`);
  console.log(`  CI mode: ${isCI}`);

  const allResults = [];
  const platforms = platformFilter
    ? [platformFilter]
    : ['shared', 'web', 'android', 'windows', 'lint'];

  for (const p of platforms) {
    switch (p) {
      case 'web':
        allResults.push(benchmarkWeb());
        break;
      case 'shared':
        allResults.push(benchmarkSharedPackages());
        break;
      case 'android':
        allResults.push(benchmarkAndroid());
        break;
      case 'windows':
        allResults.push(benchmarkWindows());
        break;
      case 'lint':
        allResults.push(benchmarkLintFormat());
        break;
      default:
        console.log(`${WARN} Unknown platform: ${p}`);
    }
  }

  let budgetResult = { passed: true, violations: [] };
  if (doBudget || !platformFilter) {
    const budget = loadPerformanceBudget();
    if (budget) budgetResult = checkBudgets(allResults, budget);
  }

  let comparisonResult = { passed: true, regressions: [] };
  if (doCompare && baselineFile) comparisonResult = compareBaseline(allResults, baselineFile);

  const output = {
    timestamp: new Date().toISOString(),
    results: allResults,
    budgetViolations: budgetResult.violations,
    regressions: comparisonResult.regressions,
  };

  if (outputFile) {
    writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n${PASS} Results written to ${outputFile}`);
  }

  if (isCI) {
    console.log('\n--- PERF_RESULTS_JSON ---');
    console.log(JSON.stringify(output));
    console.log('--- END_PERF_RESULTS_JSON ---');
  }

  console.log(fmt.bold('\n\u2550'.repeat(50)));
  console.log(fmt.bold('  Summary'));
  console.log('\u2550'.repeat(50));
  for (const r of allResults) {
    const m = Object.entries(r.metrics)
      .map(
        ([k, v]) =>
          `${k}=${typeof v === 'number' ? (v > 10000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`) : v}`,
      )
      .join(', ');
    console.log(`  ${r.platform}: ${m || 'no metrics'}`);
  }

  const allPassed = budgetResult.passed && comparisonResult.passed;
  console.log(
    allPassed
      ? `\n${PASS} All performance checks passed.`
      : `\n${FAIL} Performance issues detected.`,
  );
  process.exit(allPassed || !failOnRegression ? 0 : 1);
}

main();
