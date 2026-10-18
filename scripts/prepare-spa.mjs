#!/usr/bin/env node
import { cpSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = realpathSync(process.cwd());
const parent = path.join(root, '.deployment');
mkdirSync(parent, { recursive: true });
if (realpathSync(parent) !== parent) throw new Error('.deployment must not be a symbolic link.');
const output = path.join(parent, 'spa');
try {
  if (lstatSync(output).isSymbolicLink()) throw new Error('The SPA artifact directory must not be a symbolic link.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const { default: config } = await import(pathToFileURL(path.join(root, 'spa.config.ts')).href);
if (typeof config?.nginx !== 'string') throw new TypeError('spa.config.ts must export a SpaArtifactConfig.');
if (config.publicAsset && (!config.publicAsset.startsWith('/') || config.publicAsset.includes('..'))) {
  throw new TypeError('publicAsset must be an absolute URL path inside public/.');
}
readFileSync(path.join(root, 'dist/index.html'));
rmSync(output, { recursive: true, force: true });
mkdirSync(output);
mkdirSync(path.join(output, 'scripts'));
mkdirSync(path.join(output, 'security'));
const dist = path.join(root, 'dist');
cpSync(dist, path.join(output, 'dist'), {
  recursive: true,
  filter: (source) => source !== path.join(dist, '.vite'),
});
const performanceReport = path.join(root, 'reports/performance.json');
try {
  cpSync(performanceReport, path.join(output, 'performance.json'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const [source, destination] of [
  ['nginx/locations.conf', 'locations.conf'],
  ['docker/Dockerfile.spa', 'Dockerfile'],
  ['docker/prepare-runtime.sh', 'prepare-runtime.sh'],
  ['scripts/verify-spa.mjs', 'verify-spa.mjs'],
  ['scripts/security-tools.mjs', 'scripts/security-tools.mjs'],
  ['scripts/security-tool-directory.mjs', 'scripts/security-tool-directory.mjs'],
  ['scripts/scan-image.mjs', 'scripts/scan-image.mjs'],
  ['scripts/verify-spa-security.mjs', 'scripts/verify-spa-security.mjs'],
  ['security/tools.json', 'security/tools.json'],
  ['security/image-exceptions.json', 'security/image-exceptions.json'],
  ['security/zap.conf', 'security/zap.conf'],
]) {
  cpSync(new URL(`../${source}`, import.meta.url), path.join(output, destination));
}
writeFileSync(path.join(output, 'nginx.conf'), config.nginx);
writeFileSync(path.join(output, 'metadata.json'), JSON.stringify({ publicAsset: config.publicAsset ?? null }));
console.info('Prepared .deployment/spa from the current dist build.');
