#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createDuplicationConfig } from '../quality/index.mjs';
import {
  loadQualityPolicy,
  prepareQualityOutput,
  qualityOutput,
  relativeReportPath,
  runQualityTool,
} from './quality-process.mjs';

const policy = loadQualityPolicy();
prepareQualityOutput('duplicates.json');
const temporary = mkdtempSync(path.join(qualityOutput, '.duplicates-'));
try {
  const config = path.join(temporary, 'config.json');
  const roots = process.argv.slice(2);
  if (roots.some((root) => root.startsWith('-'))) throw new Error('Provide source directories, not scanner options.');
  const configuration = {
    ...createDuplicationConfig(policy),
    path: policy.paths.map((root) => path.resolve(root)),
    output: temporary,
    maxLines: 100_000,
    maxSize: '10mb',
  };
  writeFileSync(config, `${JSON.stringify(configuration, null, 2)}\n`);
  const result = runQualityTool('jscpd', 'jscpd', ['--config', config, ...roots.map((root) => path.resolve(root))]);
  if (result.status !== 0) throw new Error('Duplicate scanner failed. No passing report was produced.');
  const raw = JSON.parse(readFileSync(path.join(temporary, 'jscpd-report.json'), 'utf8'));
  const total = raw.statistics?.total;
  if (
    !total ||
    !Number.isFinite(total.lines) ||
    total.lines <= 0 ||
    !Number.isFinite(total.percentage) ||
    !Number.isFinite(total.duplicatedLines) ||
    !Array.isArray(raw.duplicates)
  )
    throw new Error('Duplicate scanner did not return a complete, nonempty report.');
  const position = (file) => {
    if (!file || !Number.isInteger(file.start) || !Number.isInteger(file.end))
      throw new TypeError('Invalid duplicate position.');
    return { file: relativeReportPath(file.name), start: file.start, end: file.end };
  };
  const report = {
    lines: total.lines,
    duplicatedLines: total.duplicatedLines,
    percentage: total.percentage,
    maxPercentage: roots.length ? undefined : policy.duplication.maxPercentage,
    duplicates: raw.duplicates.map((clone) => ({
      format: clone.format,
      lines: clone.lines,
      tokens: clone.tokens,
      first: position(clone.firstFile),
      second: position(clone.secondFile),
    })),
  };
  writeFileSync(path.join(qualityOutput, 'duplicates.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.info(`Duplication: ${report.percentage}% (${report.duplicates.length} clones).`);
  if (report.maxPercentage !== undefined && report.percentage > report.maxPercentage)
    throw new Error('Duplication budget exceeded; inspect reports/quality/duplicates.json.');
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
