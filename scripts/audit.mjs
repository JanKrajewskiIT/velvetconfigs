#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import { runNpm } from './npm.mjs';

const policy = JSON.parse(readFileSync(new URL('../security/audit-policy.json', import.meta.url), 'utf8'));
const expired = policy.exceptions.filter(({ expires }) => Date.parse(`${expires}T23:59:59Z`) < Date.now());
if (expired.length > 0)
  throw new Error(`Expired audit exceptions: ${expired.map(({ advisory }) => advisory).join(', ')}.`);
const result = runNpm(['audit', '--json']);
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  throw new Error('npm audit did not return a JSON report. Check registry access.');
}
if (report.error || !report.vulnerabilities || ![0, 1].includes(result.status)) {
  throw new Error('npm audit failed to obtain a vulnerability report. Check registry access.');
}
const blocked = [];
const collectAdvisories = (name, visited = new Set()) => {
  if (visited.has(name)) return [];
  visited.add(name);
  const vulnerability = report.vulnerabilities[name];
  if (!vulnerability || !Array.isArray(vulnerability.via)) {
    throw new Error(`npm audit omitted advisory details for ${name}.`);
  }
  return vulnerability.via.flatMap((advisory) =>
    typeof advisory === 'string' ? collectAdvisories(advisory, visited) : [advisory],
  );
};
const advisories = [];
for (const [name, vulnerability] of Object.entries(report.vulnerabilities)) {
  if (!['high', 'critical'].includes(vulnerability.severity)) continue;
  const causes = collectAdvisories(name);
  if (!causes.some(({ severity }) => ['high', 'critical'].includes(severity))) {
    throw new Error(`npm audit omitted high severity advisory details for ${name}.`);
  }
  if (vulnerability.severity === 'critical' && !causes.some(({ severity }) => severity === 'critical')) {
    throw new Error(`npm audit omitted critical advisory details for ${name}.`);
  }
  advisories.push(...causes);
}
for (const advisory of advisories) {
  if (!['high', 'critical'].includes(advisory.severity)) continue;
  const exception = policy.exceptions.find(
    (entry) =>
      entry.package === advisory.name &&
      entry.severity === advisory.severity &&
      advisory.url === `https://github.com/advisories/${entry.advisory}`,
  );
  if (exception) {
    console.warn(`Accepted ${exception.advisory} in ${exception.package} until ${exception.expires}.`);
  } else {
    blocked.push(`${advisory.name}: ${advisory.severity} (${advisory.url})`);
  }
}
if (blocked.length > 0) throw new Error(`Dependency audit failed:\n${[...new Set(blocked)].join('\n')}`);
console.info('Dependency audit passed (high and critical findings require an exact, unexpired exception).');
