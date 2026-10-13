#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const root = path.resolve(process.argv[2] ?? 'dist');
const manifest = JSON.parse(readFileSync(path.join(root, '.vite/manifest.json'), 'utf8'));
const sizes = new Map();
const measure = (name) => {
  const file = path.resolve(root, name);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error('Bundle path escapes dist');
  if (!sizes.has(name)) {
    const bytes = readFileSync(file);
    sizes.set(name, {
      file: name,
      bytes: bytes.length,
      gzip: gzipSync(bytes).length,
      brotli: brotliCompressSync(bytes).length,
    });
  }
  return sizes.get(name);
};
const collect = (key, files = new Set(), visited = new Set()) => {
  if (visited.has(key)) return files;
  visited.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error(`Missing manifest entry: ${key}`);
  files.add(entry.file);
  for (const css of entry.css ?? []) files.add(css);
  for (const imported of entry.imports ?? []) collect(imported, files, visited);
  return files;
};
const summarize = (files) =>
  [...files].map(measure).reduce(
    (sum, file) => ({
      bytes: sum.bytes + file.bytes,
      gzip: sum.gzip + file.gzip,
      brotli: sum.brotli + file.brotli,
    }),
    { bytes: 0, gzip: 0, brotli: 0 },
  );
const entries = Object.entries(manifest).filter(([, entry]) => entry.isEntry);
if (!entries.length) throw new Error('Performance report requires an application entry');
const initialFiles = new Set(entries.flatMap(([key]) => [...collect(key)]));
const chunks = Object.entries(manifest)
  .filter(([, entry]) => entry.isDynamicEntry)
  .map(([key]) => ({
    entry: key,
    ...summarize(collect(key)),
    additional: summarize(new Set([...collect(key)].filter((file) => !initialFiles.has(file)))),
  }));
const report = { schemaVersion: 1, initial: summarize(initialFiles), chunks, files: [...sizes.values()] };
mkdirSync('reports', { recursive: true });
writeFileSync('reports/performance.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`Initial JS/CSS: ${report.initial.gzip} bytes gzip, ${report.initial.brotli} bytes Brotli`);
if (existsSync('performance-budget.json')) {
  const budget = JSON.parse(readFileSync('performance-budget.json', 'utf8'));
  for (const metric of ['gzip', 'brotli', 'bytes']) {
    const limit = budget.initial?.[metric];
    if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0))
      throw new Error(`Invalid initial ${metric} budget`);
    if (limit !== undefined && report.initial[metric] > limit) throw new Error(`Initial ${metric} budget exceeded`);
  }
}
