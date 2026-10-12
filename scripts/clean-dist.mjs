#!/usr/bin/env node
import { rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root) throw new Error('dist must be a direct child of the project root.');
rmSync(output, { recursive: true, force: true });
