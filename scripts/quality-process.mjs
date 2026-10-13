import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { readQualityPolicy } from '../quality/index.mjs';

const consumerRequire = createRequire(path.resolve('package.json'));
export const qualityOutput = path.resolve('reports/quality');
export const loadQualityPolicy = () => readQualityPolicy(JSON.parse(readFileSync('code-quality.json', 'utf8')));
export const prepareQualityOutput = (reportName) => {
  if (!['architecture.json', 'duplicates.json', 'unused-code.json'].includes(reportName))
    throw new Error('Unknown quality report.');
  mkdirSync(qualityOutput, { recursive: true });
  rmSync(path.join(qualityOutput, reportName), { force: true });
};

export const runQualityTool = (name, bin, args) => {
  // Some tools deliberately hide package.json behind their exports map.
  const manifestPath = consumerRequire.resolve
    .paths(name)
    ?.map((root) => path.join(root, name, 'package.json'))
    .find((file) => existsSync(file));
  if (!manifestPath) throw new Error(`Missing ${name}. Install the declared dependencies.`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.name !== name) throw new Error(`Unexpected manifest for ${name}.`);
  const executable = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[bin];
  if (typeof executable !== 'string') throw new Error(`Missing ${name} executable. Install the declared dependencies.`);
  const result = spawnSync(process.execPath, [path.resolve(path.dirname(manifestPath), executable), ...args], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 300_000,
  });
  if (result.error) throw result.error;
  if (result.signal || result.status === null) throw new Error(`${name} did not complete.`);
  return result;
};

export const relativeReportPath = (value) => {
  if (typeof value !== 'string') throw new TypeError('Scanner report contains an invalid path.');
  return path.relative(process.cwd(), path.resolve(value)).split(path.sep).join('/');
};
