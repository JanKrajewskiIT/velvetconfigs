#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [image, outputDirectory] = process.argv.slice(2);
if (!image || !outputDirectory) throw new Error('Usage: scan-image.mjs <image> <report-directory>.');
const output = path.resolve(outputDirectory);
mkdirSync(output, { recursive: true });
const policy = JSON.parse(readFileSync(new URL('../security/image-exceptions.json', import.meta.url), 'utf8'));
for (const exception of policy.exceptions) {
  if (
    !exception.image ||
    !exception.package ||
    !exception.version ||
    !exception.id ||
    !exception.reason ||
    !['HIGH', 'CRITICAL'].includes(exception.severity) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(exception.expires) ||
    !Number.isFinite(Date.parse(`${exception.expires}T23:59:59Z`)) ||
    Date.parse(`${exception.expires}T23:59:59Z`) < Date.now()
  )
    throw new Error('Invalid or expired image security exception.');
}
const result = spawnSync(
  'trivy',
  [
    'image',
    '--quiet',
    '--format',
    'json',
    '--scanners',
    'vuln,secret',
    '--image-config-scanners',
    'misconfig,secret',
    '--exit-code',
    '0',
    image,
  ],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
);
if (result.error || result.status !== 0) throw new Error('Image scanner failed. No passing result is available.');
const report = JSON.parse(result.stdout);
if (report.SchemaVersion !== 2 || !Array.isArray(report.Results)) throw new Error('Unexpected Trivy report schema.');
const blocked = [];
for (const entry of report.Results) {
  for (const vulnerability of entry.Vulnerabilities ?? []) {
    if (!['HIGH', 'CRITICAL'].includes(vulnerability.Severity)) continue;
    const exception = policy.exceptions.find(
      (value) =>
        value.image === image &&
        value.id === vulnerability.VulnerabilityID &&
        value.severity === vulnerability.Severity &&
        value.package === vulnerability.PkgName &&
        value.version === vulnerability.InstalledVersion,
    );
    if (!exception) blocked.push(`${vulnerability.VulnerabilityID} (${vulnerability.PkgName})`);
  }
  for (const finding of entry.Misconfigurations ?? []) {
    if (['HIGH', 'CRITICAL'].includes(finding.Severity)) blocked.push(finding.ID);
    if (finding.CauseMetadata) delete finding.CauseMetadata.Code;
  }
  if (entry.Secrets?.length) {
    blocked.push('Embedded secret');
    entry.Secrets = entry.Secrets.map(({ RuleID, Category, Severity, Title }) => ({
      RuleID,
      Category,
      Severity,
      Title,
    }));
  }
}
const safeReport = {
  SchemaVersion: report.SchemaVersion,
  ArtifactName: report.ArtifactName,
  ArtifactType: report.ArtifactType,
  Results: report.Results,
};
writeFileSync(path.join(output, 'trivy.json'), `${JSON.stringify(safeReport, null, 2)}\n`);
const sbom = spawnSync('trivy', ['image', '--quiet', '--format', 'cyclonedx', '--scanners', 'vuln', image], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (sbom.error || sbom.status !== 0) throw new Error('Image SBOM generation failed.');
const document = JSON.parse(sbom.stdout);
if (document.bomFormat !== 'CycloneDX') throw new Error('Unexpected SBOM schema.');
writeFileSync(path.join(output, 'sbom.cdx.json'), `${JSON.stringify(document, null, 2)}\n`);
if (blocked.length) throw new Error(`Image blocked: ${[...new Set(blocked)].join(', ')}.`);
console.info('Image scan passed. HIGH/CRITICAL vulnerabilities and misconfigurations, and all secrets, are blocked.');
