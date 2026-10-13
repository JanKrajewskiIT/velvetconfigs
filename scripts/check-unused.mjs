#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { prepareQualityOutput, qualityOutput, runQualityTool } from './quality-process.mjs';

prepareQualityOutput('unused-code.json');
const result = runQualityTool('knip', 'knip', ['--reporter', 'json']);
const report = JSON.parse(result.stdout);
if (!Array.isArray(report.issues)) throw new Error('Knip did not return a complete report.');
writeFileSync(path.join(qualityOutput, 'unused-code.json'), `${JSON.stringify(report, null, 2)}\n`);
if (result.status !== 0 || report.issues.length)
  throw new Error('Unused-code check failed; inspect reports/quality/unused-code.json.');
console.info('Unused-code check passed. Public library entry exports remain supported.');
