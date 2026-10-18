#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { securityToolDirectory } from './security-tool-directory.mjs';

const [check, sourceDirectory, reportDirectory, rulesDirectory] = process.argv.slice(2);
const source = path.resolve(sourceDirectory);
const output = path.resolve(reportDirectory);
const preset = path.resolve(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(path.join(preset, 'security/tools.json'), 'utf8'));
mkdirSync(output, { recursive: true });
const run = (command, args, name, cwd = source) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(path.join(output, name), result.stdout ?? '');
  writeFileSync(path.join(output, `${name}.stderr.log`), result.stderr ?? '');
  if (result.error || result.status !== 0) {
    let termination = `exit code ${result.status}`;
    if (result.error) termination = `spawn error ${result.error.code}`;
    else if (result.signal) termination = `signal ${result.signal}`;
    throw new Error(
      `${check} failed (${termination}); inspect the restricted ${name} and ${name}.stderr.log artifacts.`,
    );
  }
};
const summarizeWorkflowFindings = () => {
  let findings;
  try {
    findings = JSON.parse(readFileSync(path.join(output, 'zizmor.json'), 'utf8'));
  } catch {
    return 'Zizmor did not produce valid JSON; inspect zizmor.json.stderr.log for scanner diagnostics.';
  }
  if (!Array.isArray(findings)) return 'Unexpected Zizmor report format; inspect the restricted artifacts.';
  const summary = [];
  for (const finding of findings) {
    if (finding?.ignored !== false || finding.determinations?.severity !== 'High') continue;
    if (typeof finding.ident !== 'string' || !/^[a-z][a-z0-9-]{0,80}$/.test(finding.ident)) continue;
    if (!Array.isArray(finding.locations)) continue;
    for (const location of finding.locations) {
      if (location?.symbolic?.kind !== 'Primary') continue;
      const file = location.symbolic.key?.Local?.verbatim_path;
      const row = location.concrete?.location?.start_point?.row;
      if (typeof file !== 'string' || !Number.isSafeInteger(row) || row < 0) continue;
      const match = /(?:^|\/)\.github\/workflows\/([a-zA-Z0-9_.-]+\.ya?ml)$/.exec(file);
      if (match) summary.push(`${finding.ident}: .github/workflows/${match[1]}:${row + 1}`);
    }
  }
  const locations = [...new Set(summary)];
  if (!locations.length) return 'No reportable High finding locations; inspect the restricted artifacts for details.';
  const lines = ['Zizmor High findings (rule and location only):', ...locations.slice(0, 20)];
  if (locations.length > 20) lines.push('Additional locations are in zizmor.json.');
  return lines.join('\n');
};
switch (check) {
  case 'secrets': {
    const range = [];
    if (process.env.PR_BASE_SHA || process.env.PR_HEAD_SHA) {
      const shas = [process.env.PR_BASE_SHA, process.env.PR_HEAD_SHA];
      if (!shas.every((value) => /^[a-f0-9]{40}$/.test(value))) throw new Error('Invalid PR commit range.');
      range.push('--log-opts', `${shas[0]}..${shas[1]}`);
    }
    run(
      'gitleaks',
      [
        'git',
        '--redact=100',
        '--no-banner',
        '--ignore-gitleaks-allow',
        '--report-format',
        'json',
        '--report-path',
        path.join(output, 'gitleaks.json'),
        ...range,
        source,
      ],
      'gitleaks.log',
    );
    break;
  }
  case 'sast': {
    if (!rulesDirectory) throw new Error('Pinned SAST rules are required.');
    const opengrep = path.join(securityToolDirectory(), 'opengrep');
    if (!existsSync(opengrep) || !statSync(opengrep).isFile()) {
      throw new Error('Install checksum-pinned Opengrep with node scripts/security-tools.mjs opengrep first.');
    }
    run(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        'none',
        '--user',
        `${process.getuid()}:${process.getgid()}`,
        '-e',
        'HOME=/tmp',
        '-e',
        'LC_ALL=C.UTF-8',
        '-v',
        `${source}:/src:ro`,
        '-v',
        `${preset}/security:/policy:ro`,
        '-v',
        `${path.resolve(rulesDirectory)}:/rules:ro`,
        '-v',
        `${opengrep}:/scanner/opengrep:ro`,
        '-w',
        '/src',
        tools.images.sastRuntime,
        '/scanner/opengrep',
        'scan',
        '--disable-version-check',
        '--strict',
        '--error',
        '--severity',
        'ERROR',
        '--config',
        '/policy/semgrep.yml',
        '--config',
        '/rules/javascript',
        '--config',
        '/rules/typescript',
        '--config',
        '/rules/csharp',
        '--exclude',
        '.agents',
        '--exclude',
        'node_modules',
        '--exclude',
        'dist',
        '--json',
        '.',
      ],
      'opengrep.json',
    );
    const report = JSON.parse(readFileSync(path.join(output, 'opengrep.json'), 'utf8'));
    if (
      !Array.isArray(report?.results) ||
      !Array.isArray(report.errors) ||
      !Array.isArray(report.paths?.scanned) ||
      report.paths.scanned.length === 0
    ) {
      throw new Error('Opengrep produced an incomplete report or scanned no files; inspect the restricted artifacts.');
    }
    if (report.errors.length > 0) {
      throw new Error('Opengrep reported scan errors; inspect the restricted opengrep.json artifact.');
    }
    break;
  }
  case 'workflows': {
    const failures = [];
    try {
      run('actionlint', ['-color'], 'actionlint.log');
    } catch (error) {
      failures.push(error.message);
    }
    try {
      run(
        'docker',
        [
          'run',
          '--rm',
          '--network',
          'none',
          '-v',
          `${source}:/src:ro`,
          tools.images.zizmor,
          '--offline',
          '--strict-collection',
          '--min-severity',
          'high',
          '--format',
          'json-v1',
          '/src/.github/workflows',
        ],
        'zizmor.json',
      );
    } catch (error) {
      failures.push(`${error.message}\n${summarizeWorkflowFindings()}`);
    }
    if (failures.length) throw new Error(failures.join('\n'));
    break;
  }
  case 'iac':
    run(
      'trivy',
      [
        'config',
        '--quiet',
        '--severity',
        'HIGH,CRITICAL',
        '--exit-code',
        '1',
        '--skip-dirs',
        '.agents,node_modules,dist',
        '--format',
        'json',
        source,
      ],
      'iac.json',
    );
    break;
  default:
    throw new Error('Allowed source checks: secrets, sast, workflows, iac.');
}
