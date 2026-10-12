#!/usr/bin/env node
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const modes = { baseline: 'zap-baseline.py', full: 'zap-full-scan.py', api: 'zap-api-scan.py' };
const mode = process.env.DAST_MODE;
if (!Object.hasOwn(modes, mode)) throw new Error(`DAST_MODE must be ${Object.keys(modes).join(', ')}.`);
const defaultHost = process.env.DAST_HOST;
const allowedHost = mode === 'api' ? process.env.DAST_API_HOST || defaultHost : defaultHost;
const validate = (value) => {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !allowedHost ||
    url.host !== allowedHost ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'DAST URL must use HTTPS and the exact configured DAST_HOST, without credentials, query or fragment.',
    );
  }
  return url.href;
};
const target = validate(mode === 'api' ? process.env.DAST_OPENAPI_URL : process.env.DAST_TARGET_URL);
const output = path.resolve('reports');
mkdirSync(output, { recursive: true });
chmodSync(output, 0o777);
const preset = path.resolve(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(path.join(preset, 'security/tools.json'), 'utf8'));
let scanTarget = target;
if (mode === 'api') {
  const response = await fetch(target, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error('Cannot fetch the staging OpenAPI definition.');
  const text = await response.text();
  if (text.length > 10 * 1024 * 1024) throw new Error('OpenAPI definition is too large.');
  const definition = JSON.parse(text);
  if (typeof definition.openapi !== 'string' || !definition.openapi.startsWith('3.')) {
    throw new Error('API DAST requires a JSON OpenAPI 3 definition.');
  }
  const constrain = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.$ref === 'string' && !value.$ref.startsWith('#/')) {
      throw new Error('External OpenAPI references are forbidden in DAST.');
    }
    if (Array.isArray(value.servers)) {
      for (const server of value.servers) server.url = validate(new URL(server.url, target).href);
    }
    for (const child of Object.values(value)) constrain(child);
  };
  constrain(definition);
  definition.servers ??= [{ url: new URL('/', target).href }];
  writeFileSync(path.join(output, 'openapi.json'), `${JSON.stringify(definition)}\n`);
  scanTarget = '/zap/wrk/openapi.json';
}
const args = [
  'run',
  '--rm',
  '-v',
  `${output}:/zap/wrk:rw`,
  '-v',
  `${preset}/security/zap.conf:/policy/zap.conf:ro`,
  tools.images.zap,
  modes[mode],
  '-t',
  scanTarget,
  '-r',
  'zap.html',
  '-J',
  'zap.json',
  '-T',
  '10',
];
if (mode === 'api') args.push('-f', 'openapi');
if (mode === 'baseline') args.push('-c', '/policy/zap.conf', '-I');
const result = spawnSync('docker', args, { stdio: 'inherit', timeout: 30 * 60 * 1000 });
if (result.error || result.status !== 0) throw new Error('DAST failed. Inspect the restricted ZAP report.');
