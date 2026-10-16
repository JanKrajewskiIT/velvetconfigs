#!/usr/bin/env node
import { chmodSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const profiles = ['waf', 'spa'];
const [image, reportDirectory, profile = profiles[0], ...extra] = process.argv.slice(2);
if (!image || !reportDirectory || !profiles.includes(profile) || extra.length) {
  throw new Error(`Usage: verify-spa-security.mjs <image> <report-directory> [${profiles.join('|')}].`);
}
const preset = path.resolve(import.meta.dirname, '..');
const tools = JSON.parse(readFileSync(path.join(preset, 'security/tools.json'), 'utf8'));
const reports = path.resolve(reportDirectory);
mkdirSync(reports, { recursive: true });
chmodSync(reports, 0o777);
const suffix = `${process.pid}-${Date.now()}`;
const network = `velvet-security-${suffix}`;
const app = `velvet-app-${suffix}`;
const waf = `velvet-waf-${suffix}`;
const describeTermination = ({ error, signal, status }) => {
  if (error) return `spawn error ${error.code ?? 'UNKNOWN'}`;
  if (signal) return `signal ${signal}`;
  return `exit code ${status}`;
};
const docker = (args, operation = args[0]) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    throw new Error(`Docker security operation failed: ${operation} (${describeTermination(result)}).`);
  }
  return result.stdout.trim();
};
const waitForHttp = async (container, port) => {
  const bindings = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', container]));
  const base = `http://127.0.0.1:${bindings[`${port}/tcp`][0].HostPort}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(2_000), redirect: 'error' });
      await response.body?.cancel();
      if (response.status === 200) return base;
    } catch {
      /* Connection refusal is expected while the application and WAF start. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error('Security target did not serve the benign SPA request within the deadline.');
};
const verifyWaf = async () => {
  docker(
    [
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
    ],
    'WAF startup',
  );
  const base = await waitForHttp(waf, 8080);
  const attack = new URL(base);
  attack.searchParams.set('id', "1' OR '1'='1");
  const response = await fetch(attack, { signal: AbortSignal.timeout(5_000), redirect: 'error' });
  await response.body?.cancel();
  if (response.status !== 403) throw new Error('WAF did not block the SQL injection regression payload.');
};
let failure;
try {
  docker(['network', 'create', network]);
  docker(
    [
      'run',
      '-d',
      '--name',
      app,
      '--network',
      network,
      '--network-alias',
      'spa',
      '-p',
      '127.0.0.1::3000',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=64m',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges:true',
      image,
    ],
    'SPA startup',
  );
  await waitForHttp(app, 3000);
  if (profile === 'waf') await verifyWaf();
  docker(
    [
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
    ],
    'ZAP baseline',
  );
} catch (error) {
  failure = error;
} finally {
  for (const args of [
    ['rm', '-f', app, ...(profile === 'waf' ? [waf] : [])],
    ['network', 'rm', network],
  ]) {
    const result = spawnSync('docker', args, { encoding: 'utf8' });
    if ((result.error || result.status !== 0) && !failure) {
      failure = new Error(`Security container cleanup failed (${describeTermination(result)}).`);
    }
  }
}
if (failure) throw failure;
console.info('ZAP baseline passed.');
if (profile === 'waf') console.info('WAF forwarding/blocking checks passed.');
