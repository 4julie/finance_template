#!/usr/bin/env node

/**
 * Test Shard Configuration - Dynamic shard allocation for parallel test execution.
 *
 * Usage:
 *   node tools/test-shard-config.js                  # Show current config
 *   node tools/test-shard-config.js --platform web   # Web sharding config
 *   node tools/test-shard-config.js --generate       # Generate CI matrix
 *   node tools/test-shard-config.js --help           # Show usage
 *
 * Generates optimal test shard configurations for:
 *   - Web (Vitest unit tests + Playwright E2E)
 *   - Android (Gradle test tasks)
 *   - KMP shared packages (JVM tests)
 *
 * Issue: #sprint-7
 */

const { execSync: _execSync } = require('child_process');
const { readFileSync: _readFileSync, existsSync, readdirSync } = require('fs');
const { resolve, join } = require('path');

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Test Shard Configuration - Finance Monorepo

Usage:
  node tools/test-shard-config.js [options]

Options:
  --platform <name>  Show config for platform (web|android|shared)
  --generate         Generate GitHub Actions matrix JSON
  --auto-size        Auto-calculate shard count based on test count
  --json             Output JSON format
  --help, -h         Show this help message

Shard Defaults:
  Web E2E (Playwright): 4 shards
  Web Unit (Vitest):    2 shards (if > 100 test files)
  Android Unit:         1 shard (Gradle parallel handles this)
  KMP JVM:              1 shard (Gradle parallel handles this)
`);
  process.exit(0);
}

const platformFilter = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : null;
const doGenerate = args.includes('--generate');
const doAutoSize = args.includes('--auto-size');
const doJson = args.includes('--json');

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = {
  bold: (s) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s) => (supportsColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s),
  dim: (s) => (supportsColor ? `\x1b[2m${s}\x1b[0m` : s),
};
const INFO = '\u2139\uFE0F';
const PASS = '\u2705';

function countFiles(dir, pattern) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  function walk(d) {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = join(d, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (pattern.test(entry.name)) count++;
      }
    } catch {
      /* skip permission errors */
    }
  }
  walk(dir);
  return count;
}

function calculateShards(testCount, maxParallel = 8) {
  if (testCount <= 20) return 1;
  if (testCount <= 50) return 2;
  if (testCount <= 100) return 3;
  return Math.min(Math.ceil(testCount / 30), maxParallel);
}

function webShardConfig() {
  console.log(fmt.bold('\n\uD83C\uDF10 Web Test Sharding'));
  console.log('\u2500'.repeat(50));

  const webDir = join(ROOT, 'apps', 'web');
  if (!existsSync(webDir)) {
    console.log(`  ${INFO} apps/web/ not found`);
    return null;
  }

  // Count unit test files
  const unitCount = countFiles(join(webDir, 'src'), /\.(test|spec)\.(ts|tsx|js|jsx)$/);
  console.log(`  ${INFO} Unit test files: ${unitCount}`);

  // Count E2E test files
  const e2eDir = join(webDir, 'e2e');
  const testsDir = join(webDir, 'tests');
  const e2eCount =
    countFiles(e2eDir, /\.(test|spec)\.(ts|js)$/) + countFiles(testsDir, /\.(test|spec)\.(ts|js)$/);
  console.log(`  ${INFO} E2E test files: ${e2eCount}`);

  const unitShards = doAutoSize ? calculateShards(unitCount, 4) : unitCount > 100 ? 2 : 1;
  const e2eShards = doAutoSize ? calculateShards(e2eCount, 8) : 4;

  console.log(`  ${PASS} Unit shards: ${unitShards}`);
  console.log(`  ${PASS} E2E shards: ${e2eShards}`);

  const config = {
    platform: 'web',
    unit: {
      runner: 'vitest',
      shards: unitShards,
      matrix: Array.from({ length: unitShards }, (_, i) => `${i + 1}/${unitShards}`),
      command: 'npx vitest run --shard={shard}',
    },
    e2e: {
      runner: 'playwright',
      shards: e2eShards,
      matrix: Array.from({ length: e2eShards }, (_, i) => `${i + 1}/${e2eShards}`),
      command: 'npx playwright test --shard={shard}',
      retries: 2,
    },
  };

  return config;
}

function androidShardConfig() {
  console.log(fmt.bold('\n\uD83E\uDD16 Android Test Sharding'));
  console.log('\u2500'.repeat(50));

  const androidDir = join(ROOT, 'apps', 'android');
  if (!existsSync(androidDir)) {
    console.log(`  ${INFO} apps/android/ not found`);
    return null;
  }

  const testCount = countFiles(join(androidDir, 'src'), /Test\.kt$/);
  console.log(`  ${INFO} Test files: ${testCount}`);
  console.log(`  ${INFO} Gradle handles parallelism internally`);
  console.log(`  ${PASS} Recommended: 1 CI job with Gradle parallel execution`);

  return {
    platform: 'android',
    unit: {
      runner: 'gradle',
      shards: 1,
      command: './gradlew :apps:android:testDebugUnitTest --parallel',
      parallelForks: Math.min(4, Math.max(1, Math.ceil(testCount / 20))),
    },
  };
}

function sharedShardConfig() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Shared Packages Test Sharding'));
  console.log('\u2500'.repeat(50));

  const packagesDir = join(ROOT, 'packages');
  if (!existsSync(packagesDir)) {
    console.log(`  ${INFO} packages/ not found`);
    return null;
  }

  const packages = ['core', 'models', 'sync'];
  const configs = [];

  for (const pkg of packages) {
    const pkgDir = join(packagesDir, pkg);
    if (!existsSync(pkgDir)) continue;
    const testCount = countFiles(pkgDir, /Test\.kt$/);
    console.log(`  ${INFO} ${pkg}: ${testCount} test files`);
    configs.push({ package: pkg, testCount });
  }

  console.log(`  ${PASS} Recommended: 1 CI job with Gradle parallel execution across packages`);

  return {
    platform: 'shared',
    runner: 'gradle',
    shards: 1,
    packages: configs,
    command:
      './gradlew :packages:core:jvmTest :packages:models:jvmTest :packages:sync:jvmTest --parallel',
  };
}

function generateMatrix() {
  console.log(fmt.bold('\n\uD83D\uDCCB GitHub Actions Matrix'));
  console.log('\u2500'.repeat(50));

  const web = webShardConfig();

  if (web) {
    console.log('\nWeb E2E matrix (for strategy.matrix.shard):');
    console.log(JSON.stringify(web.e2e.matrix));
    console.log('\nWeb Unit matrix:');
    console.log(JSON.stringify(web.unit.matrix));
  }
}

function main() {
  console.log('');
  console.log(fmt.bold('\uD83E\uDDE9 Finance - Test Shard Configuration'));
  console.log('\u2550'.repeat(50));

  const results = {};

  if (!platformFilter || platformFilter === 'web') results.web = webShardConfig();
  if (!platformFilter || platformFilter === 'android') results.android = androidShardConfig();
  if (!platformFilter || platformFilter === 'shared') results.shared = sharedShardConfig();

  if (doGenerate) generateMatrix();

  if (doJson) {
    console.log('\n--- SHARD_CONFIG_JSON ---');
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...results }, null, 2));
    console.log('--- END_SHARD_CONFIG_JSON ---');
  }

  console.log(`\n${PASS} Shard configuration complete.`);
}

main();
