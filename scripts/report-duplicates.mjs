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
prepareQualityOutput('duplicates-diagnostics.json');
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
  const outputExcerpt = (value) => {
    if (typeof value !== 'string') return undefined;
    const output = value.trim();
    if (!output) return undefined;
    return output.length <= 4_000 ? output : `${output.slice(0, 4_000)}…[truncated]`;
  };
  const stdout = outputExcerpt(result.stdout);
  const stderr = outputExcerpt(result.stderr);
  const scanner = {
    tool: 'jscpd',
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    exitCode: result.status,
    paths: roots.length ? roots : policy.paths,
    ...(stdout ? { stdout } : {}),
    ...(stderr ? { stderr } : {}),
  };
  const writeDiagnostics = (details) =>
    writeFileSync(
      path.join(qualityOutput, 'duplicates-diagnostics.json'),
      `${JSON.stringify({ scanner, ...details }, null, 2)}\n`,
    );
  if (result.status !== 0) {
    writeDiagnostics({ reason: 'scanner-failed' });
    throw new Error('Duplicate scanner failed. Inspect reports/quality/duplicates-diagnostics.json.');
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(path.join(temporary, 'jscpd-report.json'), 'utf8'));
  } catch (error) {
    writeDiagnostics({
      reason: 'report-unreadable',
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      'Duplicate scanner report could not be read. Inspect reports/quality/duplicates-diagnostics.json.',
      { cause: error },
    );
  }
  const rawReport = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const statistics = rawReport.statistics;
  const total = statistics?.total;
  if (
    !total ||
    !Number.isFinite(total.lines) ||
    total.lines <= 0 ||
    !Number.isFinite(total.percentage) ||
    !Number.isFinite(total.duplicatedLines) ||
    !Array.isArray(rawReport.duplicates)
  ) {
    const describe = (value) => ({
      type: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
      ...(typeof value === 'number' && Number.isFinite(value) ? { value } : {}),
    });
    const statisticsRecord = statistics && typeof statistics === 'object' ? statistics : {};
    writeDiagnostics({
      reason: 'report-incomplete',
      report: {
        reportType: raw === null ? 'null' : Array.isArray(raw) ? 'array' : typeof raw,
        keys: Object.keys(rawReport).slice(0, 50),
        statisticsType: statistics === null ? 'null' : Array.isArray(statistics) ? 'array' : typeof statistics,
        statisticsKeys: Object.keys(statisticsRecord).slice(0, 50),
        totalType: total === null ? 'null' : Array.isArray(total) ? 'array' : typeof total,
        totalKeys: total && typeof total === 'object' ? Object.keys(total) : [],
        lines: describe(total?.lines),
        percentage: describe(total?.percentage),
        duplicatedLines: describe(total?.duplicatedLines),
        duplicatesType: Array.isArray(rawReport.duplicates) ? 'array' : typeof rawReport.duplicates,
        duplicateCount: Array.isArray(rawReport.duplicates) ? rawReport.duplicates.length : undefined,
      },
    });
    throw new Error(
      'Duplicate scanner returned an incomplete report. Inspect reports/quality/duplicates-diagnostics.json.',
    );
  }
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
    duplicates: rawReport.duplicates.map((clone) => ({
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
