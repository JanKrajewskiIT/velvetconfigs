import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const notice =
  '# Generated from VelvetConfigs/.github/workflows/codeql-analysis.yml; update through its sync-codeql script.\n';
const source = readFileSync(new URL('../workflows/codeql-analysis.yml', import.meta.url), 'utf8');
const generated = `${notice}${source}`;
const WRITE_FLAG = '--write';
const args = process.argv.slice(2);
const write = args.includes(WRITE_FLAG);
const projects = args.filter((arg) => arg !== WRITE_FLAG);
if (!projects.length || projects.some((project) => project.startsWith('-')))
  throw new Error(`Usage: node .github/scripts/sync-codeql.mjs [${WRITE_FLAG}] <project-directory> [...].`);

for (const project of projects) {
  const file = path.resolve(project, '.github/workflows/codeql-analysis.yml');
  const current = existsSync(file) ? readFileSync(file, 'utf8') : undefined;
  if (current === generated) continue;
  if (current !== undefined && !current.startsWith(notice))
    throw new Error(`Refusing to overwrite a workflow without the generated notice: ${file}`);
  if (!write) throw new Error(`CodeQL workflow needs synchronization: ${file}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, generated);
}
