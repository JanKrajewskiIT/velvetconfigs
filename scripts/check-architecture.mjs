#!/usr/bin/env node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { createArchitectureConfig } from '../quality/index.mjs';
import { loadQualityPolicy, prepareQualityOutput, qualityOutput, runQualityTool } from './quality-process.mjs';

const policy = loadQualityPolicy();
prepareQualityOutput('architecture.json');
const consumerRequire = createRequire(path.resolve('package.json'));
const typescript = consumerRequire('typescript');
const tsConfigFile = path.resolve(policy.tsConfig);
const tsConfig = typescript.getParsedCommandLineOfConfigFile(
  tsConfigFile,
  {},
  {
    ...typescript.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    },
  },
);
if (tsConfig.errors.length)
  throw new Error(
    tsConfig.errors.map(({ messageText }) => typescript.flattenDiagnosticMessageText(messageText, '\n')).join('\n'),
  );
const temporary = mkdtempSync(path.join(qualityOutput, '.architecture-'));
try {
  const config = path.join(temporary, 'config.json');
  const architecture = createArchitectureConfig(policy);
  if (tsConfig.options.baseUrl || Object.keys(tsConfig.options.paths ?? {}).length) {
    architecture.options.tsConfig.fileName = tsConfigFile;
  } else {
    // The scanner's paths plugin invents a root wildcard even without TypeScript aliases.
    delete architecture.options.tsConfig;
  }
  writeFileSync(config, `${JSON.stringify(architecture, null, 2)}\n`);
  const result = runQualityTool('dependency-cruiser', 'depcruise', [
    '--config',
    config,
    '--output-type',
    'json',
    ...policy.paths,
  ]);
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch (cause) {
    const diagnostic = result.stderr.trim() || 'No scanner diagnostic was returned.';
    throw new Error(`Architecture scanner returned invalid JSON (exit ${result.status}).\n${diagnostic}`, { cause });
  }
  if (!Array.isArray(report.modules) || !Array.isArray(report.summary?.violations) || !report.modules.length)
    throw new Error('Architecture scanner did not return a complete, nonempty report.');
  const violations = report.summary.violations.map(({ from, to, rule }) => ({
    from,
    to,
    rule: rule?.name,
    severity: rule?.severity,
  }));
  const summary = {
    modules: report.modules.map(({ source, dependencies }) => ({
      source,
      dependencies: dependencies.map(({ resolved }) => resolved),
    })),
    violations,
  };
  writeFileSync(path.join(qualityOutput, 'architecture.json'), `${JSON.stringify(summary, null, 2)}\n`);
  if (result.status !== 0 || violations.length) {
    for (const item of violations.slice(0, 30)) console.error(`${item.rule}: ${item.from} -> ${item.to}`);
    throw new Error('Architecture check failed; inspect reports/quality/architecture.json.');
  }
  console.info(`Architecture passed (${report.modules.length} modules).`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
