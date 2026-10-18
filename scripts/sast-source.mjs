import { createHash } from 'node:crypto';
import {
  closeSync,
  constants,
  cpSync,
  fstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';

export const sastExcludedDirectories = ['.agents', 'node_modules', 'dist'];

const isInsideDirectory = (directory, file) => {
  const relative = path.relative(directory, file);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
};

const withSastCleanup = (operation, cleanup, failureMessage) => {
  const failures = [];
  let result;
  try {
    result = operation();
  } catch (error) {
    failures.push(error);
  }
  try {
    cleanup();
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, failureMessage, { cause: failures[0] });
  return result;
};

const withSastFile = (file, access, operation) => {
  if (constants.O_NOFOLLOW === undefined || constants.O_NONBLOCK === undefined) {
    throw new Error('SAST source preparation requires O_NOFOLLOW and O_NONBLOCK support.');
  }
  const descriptor = openSync(file, access | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  return withSastCleanup(
    () => operation(descriptor),
    () => closeSync(descriptor),
    'SAST file access and cleanup failed.',
  );
};

const readSastFile = (file) => {
  try {
    return withSastFile(file, constants.O_RDONLY, (descriptor) => {
      if (!fstatSync(descriptor).isFile()) return undefined;
      return readFileSync(descriptor);
    });
  } catch (error) {
    if (['ENOENT', 'ELOOP'].includes(error.code)) return undefined;
    throw error;
  }
};

const writeNormalizedFile = (file, original, normalized) =>
  withSastFile(file, constants.O_RDWR, (descriptor) => {
    if (!fstatSync(descriptor).isFile() || !readFileSync(descriptor).equals(original)) {
      throw new Error('SAST source changed during preparation; rerun against a stable checkout.');
    }
    const bytes = Buffer.from(normalized);
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
      if (written === 0) throw new Error('Cannot finish writing normalized SAST source.');
      offset += written;
    }
  });

const normalizeConstTypeParameters = (file, text) => {
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const modifiers = [];
  const visit = (node) => {
    if (ts.isTypeParameterDeclaration(node)) {
      for (const modifier of node.modifiers ?? []) {
        if (modifier.kind === ts.SyntaxKind.ConstKeyword) {
          modifiers.push({ start: modifier.getStart(sourceFile), end: modifier.end });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (modifiers.length && sourceFile.parseDiagnostics.length) {
    const codes = sourceFile.parseDiagnostics.map(({ code }) => code).join(', ');
    throw new Error(`Cannot normalize ${JSON.stringify(file)} with TypeScript parse diagnostics: ${codes}.`);
  }
  let normalized = text;
  for (const { start, end } of modifiers.toReversed()) {
    normalized = normalized.slice(0, start) + ' '.repeat(end - start) + normalized.slice(end);
  }
  return { normalized, count: modifiers.length };
};

export const withSastSource = (source, files, output, scan) => {
  const changes = [];
  for (const file of files) {
    if (!/\.(?:ts|tsx|mts|cts)$/u.test(file)) continue;
    if (file.split('/').some((part) => sastExcludedDirectories.includes(part))) continue;
    const originalFile = path.resolve(source, file);
    if (!isInsideDirectory(source, originalFile)) {
      throw new Error('SAST source files must remain inside the source directory.');
    }
    const original = readSastFile(originalFile);
    if (original === undefined) continue;
    const text = original.toString('utf8');
    const { normalized, count } = normalizeConstTypeParameters(file, text);
    if (!count) continue;
    if (!Buffer.from(text).equals(original)) {
      throw new Error(`Cannot normalize non-UTF-8 TypeScript: ${JSON.stringify(file)}.`);
    }
    changes.push({ file, original, normalized, count });
  }
  const sha256 = (content) => createHash('sha256').update(content).digest('hex');
  const manifest = changes.map(({ file, original, normalized, count }) => ({
    path: file,
    constTypeParameters: count,
    originalSha256: sha256(original),
    normalizedSha256: sha256(normalized),
  }));
  writeFileSync(path.join(output, 'sast-normalization.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  if (!changes.length) {
    scan(source);
    return;
  }
  const temporary = mkdtempSync(path.join(tmpdir(), 'velvet-sast-'));
  withSastCleanup(
    () => {
      if (isInsideDirectory(source, temporary)) {
        throw new Error('The temporary SAST directory must be outside the source directory.');
      }
      cpSync(source, temporary, {
        recursive: true,
        verbatimSymlinks: true,
        filter: (entry) =>
          entry === source ||
          path.relative(source, entry).split(path.sep)[0] === '.git' ||
          !sastExcludedDirectories.includes(path.basename(entry)),
      });
      for (const { file, original, normalized } of changes) {
        writeNormalizedFile(path.join(temporary, file), original, normalized);
      }
      scan(temporary);
    },
    () => rmSync(temporary, { recursive: true, force: true }),
    'SAST failed and its temporary source could not be removed.',
  );
};
