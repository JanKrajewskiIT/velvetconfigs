#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';

const root = realpathSync(process.cwd());
const source = path.resolve(root, 'src/styles');
const target = path.resolve(root, 'dist/styles');
if (realpathSync(source) !== source || realpathSync(path.dirname(target)) !== path.dirname(target)) {
  throw new Error('Styles packaging does not accept symbolic-link roots');
}
if (existsSync(target) && lstatSync(target).isSymbolicLink())
  throw new Error('Styles target must not be a symbolic link');
mkdirSync(target, { recursive: true });
cpSync(source, target, {
  recursive: true,
  filter: (file) => {
    if (lstatSync(file).isSymbolicLink()) throw new Error('Styles packaging does not accept symbolic links');
    return true;
  },
});
