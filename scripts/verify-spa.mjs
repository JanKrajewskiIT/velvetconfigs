#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const image = process.argv[2] ?? 'velvet-spa:verified';
const docker = (...arguments_) => execFileSync('docker', arguments_, { encoding: 'utf8' }).trim();
docker('run', '--rm', '--entrypoint', 'nginx', image, '-g', 'pid /tmp/nginx.pid;', '-t');
const container = docker('run', '--detach', '--publish', '127.0.0.1::3000', image);
let failure;
try {
  const port = docker('port', container, '3000/tcp').split(':').at(-1);
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      ready = (await fetch(base, { signal: AbortSignal.timeout(2000) })).ok;
    } catch {
      // The container can be reachable only after its entrypoint has completed.
    }
    if (ready) break;
    await setTimeout(1000);
  }
  assert.ok(ready, 'SPA container did not start.');
  const document = await fetch(`${base}/index.html`);
  const html = await document.text();
  assert.equal(document.status, 200);
  assert.equal(document.headers.get('cache-control'), 'no-cache, no-store, must-revalidate');
  assert.equal(document.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(document.headers.get('content-security-policy'), 'CSP is missing.');
  const rootDocument = await fetch(base);
  assert.equal(rootDocument.status, 200);
  assert.equal(await rootDocument.text(), html);
  assert.equal(rootDocument.headers.get('cache-control'), document.headers.get('cache-control'));
  const deepRoute = await fetch(`${base}/__configuration_check__/deep`);
  assert.equal(deepRoute.status, 200);
  assert.equal(await deepRoute.text(), html, 'Deep routes must serve the entry document.');
  assert.equal(deepRoute.headers.get('cache-control'), document.headers.get('cache-control'));
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.(?:js|css))"/gu)].map((match) => match[1]);
  assert.ok(assets.length > 0, 'The entry document has no root-relative JS/CSS assets.');
  for (const asset of assets) {
    const response = await fetch(`${base}${asset}`, { headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(response.status, 200, asset);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable', asset);
    assert.equal(response.headers.get('content-encoding'), 'gzip', asset);
    assert.ok(response.headers.get('content-security-policy'), `Asset ${asset} lost inherited headers.`);
  }
  const { publicAsset } = JSON.parse(readFileSync(new URL('./metadata.json', import.meta.url), 'utf8'));
  if (publicAsset) {
    const response = await fetch(`${base}${publicAsset}`);
    assert.equal(response.status, 200, publicAsset);
    assert.equal(response.headers.get('cache-control'), 'no-cache', publicAsset);
  }
  const missing = await fetch(`${base}/assets/missing-12345678.js`);
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get('cache-control'), 'no-cache');
} catch (error) {
  failure = { error };
} finally {
  try {
    docker('rm', '--force', container);
  } catch (error) {
    if (failure === undefined) failure = { error };
    else console.warn(`Container cleanup failed; remove ${container} after Docker becomes available.`);
  }
}
if (failure !== undefined) throw failure.error;
console.info('SPA syntax, routing, gzip, CSP and cache headers verified.');
