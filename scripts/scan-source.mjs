#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [check, sourceDirectory, reportDirectory, rulesDirectory] = process.argv.slice(2);
const source = path.resolve(sourceDirectory);
const output = path.resolve(reportDirectory);
const preset = path.resolve(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(path.join(preset, 'security/tools.json'), 'utf8'));
mkdirSync(output, { recursive: true });
const run = (command, args, name, cwd = source) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(path.join(output, name), result.stdout ?? '');
  if (result.stderr) writeFileSync(path.join(output, `${name}.stderr.log`), result.stderr);
  if (result.error || result.status !== 0) throw new Error(`${check} failed; inspect the restricted ${name} artifact.`);
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
  case 'sast':
    if (!rulesDirectory) throw new Error('Pinned Semgrep rules are required.');
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
        '-v',
        `${source}:/src:ro`,
        '-v',
        `${preset}/security:/policy:ro`,
        '-v',
        `${path.resolve(rulesDirectory)}:/rules:ro`,
        '-w',
        '/src',
        tools.images.semgrep,
        'semgrep',
        'scan',
        '--metrics',
        'off',
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
      'semgrep.json',
    );
    break;
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
          'json',
          '/src/.github/workflows',
        ],
        'zizmor.json',
      );
    } catch (error) {
      failures.push(error.message);
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
