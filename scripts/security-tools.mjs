#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { securityToolDirectory } from './security-tool-directory.mjs';

const tools = JSON.parse(readFileSync(new URL('../security/tools.json', import.meta.url), 'utf8'));
const directory = securityToolDirectory();
mkdirSync(directory, { recursive: true });
for (const name of process.argv.slice(2)) {
  const tool = tools.binaries[name];
  if (!tool) throw new Error(`Unknown security binary: ${name}.`);
  const response = await fetch(tool.url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Cannot download ${name}: HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== tool.sha256) {
    throw new Error(`Checksum mismatch for ${name}.`);
  }
  const file = path.join(directory, tool.archive ? `${name}.tar.gz` : name);
  writeFileSync(file, bytes, { mode: 0o755 });
  if (tool.archive) {
    const result = spawnSync('tar', ['-xzf', file, '-C', directory, name], { stdio: 'inherit' });
    if (result.error || result.status !== 0) throw new Error(`Cannot extract ${name}.`);
  }
}
if (process.env.GITHUB_PATH) writeFileSync(process.env.GITHUB_PATH, `${directory}\n`, { flag: 'a' });
console.info(`Security binaries installed in ${directory}.`);
