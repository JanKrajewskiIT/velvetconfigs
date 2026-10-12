#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8'));
const nodeMajor = readFileSync(path.resolve('.nvmrc'), 'utf8').trim();
const nodeVersion = readFileSync(path.resolve('.node-version'), 'utf8').trim();
if (nodeVersion !== nodeMajor) throw new Error('.node-version and .nvmrc must select the same Node.js major.');
if (!/^\d+$/u.test(nodeMajor)) throw new Error('.nvmrc must contain a Node.js major version.');
if (process.versions.node.split('.')[0] !== nodeMajor) {
  throw new Error(`Use Node.js ${nodeMajor} (.nvmrc); current version is ${process.versions.node}.`);
}
if (!process.argv.includes('--node-only')) {
  const npmVersion = /^npm@(\d+\.\d+\.\d+)$/u.exec(manifest.packageManager)?.[1];
  if (!npmVersion) throw new Error('packageManager must specify an exact npm version.');
  const actualVersion = /^npm\/([^ ]+)/u.exec(process.env.npm_config_user_agent ?? '')?.[1];
  if (actualVersion !== npmVersion) {
    throw new Error(`Use npm ${npmVersion} (packageManager); run npm install --global npm@${npmVersion}.`);
  }
}
