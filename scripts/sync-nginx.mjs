#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

import { createSpaNginxConfig } from '../nginx/index.mjs';

const file = new URL('../nginx/spa.conf', import.meta.url);
const locations = readFileSync(new URL('../nginx/locations.conf', import.meta.url), 'utf8').trim();
const configuration =
  '# Generated from nginx/index.mjs and locations.conf; run npm run nginx:sync.\n' +
  createSpaNginxConfig().replace('    include /etc/nginx/snippets/velvet-spa.conf;', () =>
    locations
      .split('\n')
      .map((line) => (line ? `    ${line}` : ''))
      .join('\n'),
  );
if (process.argv.includes('--write')) writeFileSync(file, configuration);
else if (readFileSync(file, 'utf8') !== configuration)
  throw new Error('nginx/spa.conf is stale; run npm run nginx:sync.');
