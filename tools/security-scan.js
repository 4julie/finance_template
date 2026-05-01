#!/usr/bin/env node

/**
 * Security Scan - Local security scanning across all code and dependencies.
 *
 * Usage:
 *   node tools/security-scan.js            # Full scan
 *   node tools/security-scan.js --secrets  # Secret detection only
 *   node tools/security-scan.js --deps     # Dependency audit only
 *   node tools/security-scan.js --code     # Static analysis only
 *   node tools/security-scan.js --help     # Show usage
 *
 * Scans for:
 *   - Hardcoded secrets (API keys, tokens, passwords)
 *   - Dependency vulnerabilities (npm audit)
 *   - Sensitive data logging patterns
 *   - SQL injection patterns
 *   - Insecure crypto usage
 *
 * Issue: #sprint-8
 */

const { execSync } = require('child_process');
const { readFileSync, existsSync, readdirSync } = require('fs');
const { resolve, join, extname } = require('path');

const ROOT = resolve(__dirname, '..');
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Security Scan - Finance Monorepo

Usage:
  node tools/security-scan.js [options]

Options:
  --secrets        Secret detection only
  --deps           Dependency vulnerability audit only
  --code           Static code analysis only
  --fix            Auto-fix where possible
  --json           Output JSON results
  --help, -h       Show this help message
`);
  process.exit(0);
}

const secretsOnly = args.includes('--secrets');
const depsOnly = args.includes('--deps');
const codeOnly = args.includes('--code');
const doAll = !secretsOnly && !depsOnly && !codeOnly;
const doJson = args.includes('--json');

const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;
const fmt = {
  bold: (s) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s),
  red: (s) => (supportsColor ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (supportsColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s),
};
const PASS = '\u2705';
const FAIL = '\u274C';
const WARN = '\u26A0\uFE0F';

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic API Key', pattern: /api[_-]?key\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/ },
  { name: 'Generic Secret', pattern: /secret\s*[:=]\s*['"][A-Za-z0-9_-]{20,}['"]/ },
  { name: 'Private Key', pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/ },
  { name: 'JWT Token', pattern: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/ },
  { name: 'Database URL with password', pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@/ },
  { name: 'Bearer Token', pattern: /Bearer\s+[A-Za-z0-9_\-.]{20,}/ },
  { name: 'Supabase Key', pattern: /sbp_[a-f0-9]{40}/ },
];

const CODE_PATTERNS = [
  {
    name: 'SQL Injection Risk',
    pattern: /`[^`]*\$\{[^}]+\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i,
    severity: 'high',
  },
  {
    name: 'Sensitive Data Logging',
    pattern:
      /console\.(log|info|debug|warn)\([^)]*(?:password|secret|token|apiKey|creditCard|ssn)/i,
    severity: 'high',
  },
  {
    name: 'Hardcoded Password',
    pattern: /password\s*[:=]\s*['"][^'"]{4,}['"]/,
    severity: 'critical',
  },
  { name: 'eval() Usage', pattern: /\beval\s*\(/, severity: 'medium' },
  { name: 'innerHTML Assignment', pattern: /\.innerHTML\s*=/, severity: 'medium' },
  {
    name: 'Insecure Math.random',
    pattern: /Math\.random\(\).*(?:token|key|secret|id|session)/i,
    severity: 'medium',
  },
];

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.kt',
  '.kts',
  '.swift',
  '.sql',
]);
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  '.gradle',
  '.turbo',
  'coverage',
]);

function walkFiles(dir, callback) {
  if (!existsSync(dir)) return;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walkFiles(full, callback);
      else if (SCAN_EXTENSIONS.has(extname(entry.name))) callback(full);
    }
  } catch {
    /* skip */
  }
}

function scanSecrets() {
  console.log(fmt.bold('\n\uD83D\uDD10 Secret Detection'));
  console.log('\u2500'.repeat(50));

  const findings = [];
  walkFiles(ROOT, (filePath) => {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relPath = filePath.replace(ROOT + (process.platform === 'win32' ? '\\' : '/'), '');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        for (const sp of SECRET_PATTERNS) {
          if (sp.pattern.test(lines[i])) {
            // Skip test files and example files
            if (
              relPath.includes('.test.') ||
              relPath.includes('.spec.') ||
              relPath.includes('.example') ||
              relPath.includes('__mocks__')
            )
              continue;
            findings.push({
              file: relPath,
              line: i + 1,
              pattern: sp.name,
              severity: 'critical',
            });
          }
        }
      }
    } catch {
      /* skip binary/unreadable files */
    }
  });

  if (findings.length === 0) {
    console.log(`  ${PASS} No hardcoded secrets detected`);
  } else {
    console.log(`  ${FAIL} ${findings.length} potential secret(s) found:`);
    for (const f of findings.slice(0, 20)) {
      console.log(`    ${fmt.red('\u2022')} ${f.file}:${f.line} - ${f.pattern}`);
    }
    if (findings.length > 20) {
      console.log(`    ... and ${findings.length - 20} more`);
    }
  }

  return findings;
}

function scanCode() {
  console.log(fmt.bold('\n\uD83D\uDD0D Static Code Analysis'));
  console.log('\u2500'.repeat(50));

  const findings = [];
  walkFiles(ROOT, (filePath) => {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relPath = filePath.replace(ROOT + (process.platform === 'win32' ? '\\' : '/'), '');
      const lines = content.split('\n');

      // Skip test files for most checks
      const isTestFile = relPath.includes('.test.') || relPath.includes('.spec.');

      for (let i = 0; i < lines.length; i++) {
        for (const cp of CODE_PATTERNS) {
          if (isTestFile && cp.severity !== 'critical') continue;
          if (cp.pattern.test(lines[i])) {
            findings.push({
              file: relPath,
              line: i + 1,
              pattern: cp.name,
              severity: cp.severity,
            });
          }
        }
      }
    } catch {
      /* skip */
    }
  });

  if (findings.length === 0) {
    console.log(`  ${PASS} No security code patterns detected`);
  } else {
    const critical = findings.filter((f) => f.severity === 'critical');
    const high = findings.filter((f) => f.severity === 'high');
    const medium = findings.filter((f) => f.severity === 'medium');

    if (critical.length > 0) {
      console.log(`  ${FAIL} ${critical.length} CRITICAL finding(s):`);
      critical
        .slice(0, 5)
        .forEach((f) => console.log(`    ${fmt.red('\u2022')} ${f.file}:${f.line} - ${f.pattern}`));
    }
    if (high.length > 0) {
      console.log(`  ${WARN} ${high.length} HIGH finding(s):`);
      high
        .slice(0, 5)
        .forEach((f) =>
          console.log(`    ${fmt.yellow('\u2022')} ${f.file}:${f.line} - ${f.pattern}`),
        );
    }
    if (medium.length > 0) {
      console.log(
        `  ${fmt.yellow('!')} ${medium.length} MEDIUM finding(s) (run with --json for details)`,
      );
    }
  }

  return findings;
}

function scanDeps() {
  console.log(fmt.bold('\n\uD83D\uDCE6 Dependency Vulnerabilities'));
  console.log('\u2500'.repeat(50));

  try {
    execSync('npm audit --audit-level=high', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log(`  ${PASS} No high/critical npm vulnerabilities`);
    return [];
  } catch (err) {
    const output = err.stdout || '';
    const vulnMatch = output.match(/(\d+)\s+vulnerabilities/);
    const count = vulnMatch ? vulnMatch[1] : 'unknown';
    console.log(`  ${FAIL} ${count} npm vulnerability(ies) found`);
    console.log(`    Run: npm audit fix`);
    return [{ type: 'npm', count }];
  }
}

function main() {
  console.log('');
  console.log(fmt.bold('\uD83D\uDD12 Finance - Security Scan'));
  console.log('\u2550'.repeat(50));

  const allFindings = { secrets: [], code: [], deps: [] };

  if (doAll || secretsOnly) allFindings.secrets = scanSecrets();
  if (doAll || codeOnly) allFindings.code = scanCode();
  if (doAll || depsOnly) allFindings.deps = scanDeps();

  // Summary
  console.log('\n' + '\u2550'.repeat(50));
  const totalCritical =
    allFindings.secrets.length + allFindings.code.filter((f) => f.severity === 'critical').length;
  const totalHigh = allFindings.code.filter((f) => f.severity === 'high').length;
  const totalMedium = allFindings.code.filter((f) => f.severity === 'medium').length;

  console.log(fmt.bold('  Security Summary'));
  console.log(`    Critical: ${totalCritical}`);
  console.log(`    High:     ${totalHigh}`);
  console.log(`    Medium:   ${totalMedium}`);
  console.log(`    Deps:     ${allFindings.deps.length} ecosystem(s) with issues`);

  if (doJson) {
    console.log('\n--- SECURITY_JSON ---');
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), ...allFindings }, null, 2));
    console.log('--- END_SECURITY_JSON ---');
  }

  const hasIssues = totalCritical > 0 || totalHigh > 0 || allFindings.deps.length > 0;
  console.log(
    hasIssues
      ? `\n${FAIL} Security issues found. Review and remediate before releasing.`
      : `\n${PASS} No significant security issues detected.`,
  );

  process.exit(hasIssues ? 1 : 0);
}

main();
