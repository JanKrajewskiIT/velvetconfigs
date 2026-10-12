#!/usr/bin/env node
import { chmodSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [image, reportDirectory] = process.argv.slice(2);
if (!image || !reportDirectory) throw new Error('Usage: verify-spa-security.mjs <image> <report-directory>.');
const preset = path.resolve(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(path.join(preset, 'security/tools.json'), 'utf8'));
const reports = path.resolve(reportDirectory);
mkdirSync(reports, { recursive: true });
chmodSync(reports, 0o777);
const suffix = `${process.pid}-${Date.now()}`;
const network = `velvet-security-${suffix}`;
const app = `velvet-app-${suffix}`;
const waf = `velvet-waf-${suffix}`;
const docker = (args) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Docker security operation failed: ${args[0]}.`);
  return result.stdout.trim();
};
let failure;
try {
  docker(['network', 'create', network]);
  docker([
    'run',
    '-d',
    '--name',
    app,
    '--network',
    network,
    '--network-alias',
    'spa',
    '--read-only',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,size=64m',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges:true',
    image,
  ]);
  docker([
    'run',
    '-d',
    '--name',
    waf,
    '--network',
    network,
    '-p',
    '127.0.0.1::8080',
    '-e',
    'BACKEND=http://spa:3000',
    '-e',
    'PORT=8080',
    '-e',
    'MODSEC_RULE_ENGINE=On',
    '-e',
    'MODSEC_AUDIT_LOG_PARTS=AHZ',
    '-e',
    'MODSEC_RESP_BODY_ACCESS=Off',
    '-e',
    'NGINX_X_FORWARDED_PROTO=http',
    tools.images.waf,
  ]);
  const bindings = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', waf]));
  const base = `http://127.0.0.1:${bindings['8080/tcp'][0].HostPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(2_000) });
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* Connection refusal is expected while the two proxies start. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  if (!ready) throw new Error('WAF did not forward the benign SPA request within the deadline.');
  const attack = new URL(base);
  attack.searchParams.set('id', "1' OR '1'='1");
  const response = await fetch(attack, { signal: AbortSignal.timeout(5_000) });
  if (response.status !== 403) throw new Error('WAF did not block the SQL injection regression payload.');
  docker([
    'run',
    '--rm',
    '--network',
    network,
    '-v',
    `${reports}:/zap/wrk:rw`,
    '-v',
    `${preset}/security/zap.conf:/policy/zap.conf:ro`,
    tools.images.zap,
    'zap-baseline.py',
    '-t',
    'http://spa:3000',
    '-c',
    '/policy/zap.conf',
    '-m',
    '1',
    '-T',
    '5',
    '-I',
    '-r',
    'zap.html',
    '-J',
    'zap.json',
  ]);
} catch (error) {
  failure = error;
} finally {
  for (const args of [
    ['rm', '-f', waf, app],
    ['network', 'rm', network],
  ]) {
    const result = spawnSync('docker', args, { encoding: 'utf8' });
    if ((result.error || result.status !== 0) && !failure) failure = new Error('Security container cleanup failed.');
  }
}
if (failure) throw failure;
console.info('ZAP baseline and WAF forwarding/blocking checks passed.');
