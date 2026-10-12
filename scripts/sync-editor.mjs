#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const readPreset = (file) => JSON.parse(readFileSync(new URL(`../editor/${file}.json`, import.meta.url), 'utf8'));
const workspace = {
  folders: [{ path: '.' }],
  settings: readPreset('settings'),
  extensions: readPreset('extensions'),
};
const file = path.resolve('frontend.code-workspace');
if (process.argv.includes('--write')) writeFileSync(file, `${JSON.stringify(workspace, null, 2)}\n`);
else if (JSON.stringify(JSON.parse(readFileSync(file, 'utf8'))) !== JSON.stringify(workspace)) {
  throw new Error('frontend.code-workspace differs from the shared preset; run npm run editor:sync.');
}
