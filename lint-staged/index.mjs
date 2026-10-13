import { relative } from 'node:path';

const DEFAULT_TARGETS = {
  eslintTarget: '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}',
  stylelintTarget: '*.css',
  prettierTarget: '*.{json,md,yml,yaml,html}',
};

const PRETTIER_WRITE = 'prettier --write';
const DEFAULT_CHUNK_SIZE = 25;
const DEFAULT_MAX_COMMAND_LENGTH = 7000;

const assertPositiveInteger = (value, name) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`createLintStagedConfig: "${name}" must be a positive integer.`);
  }
};

const quoteFile = (file) => `"${file.replaceAll('"', '\\"')}"`;

const createTask =
  (tools, { chunkSize, maxCommandLength, ignorePaths }) =>
  (files) => {
    const owned = files
      .map((file) => relative(process.cwd(), file).replaceAll('\\', '/'))
      .filter((file) => !ignorePaths.some((pattern) => pattern.test(file)))
      .map(quoteFile);

    return tools.flatMap((tool) => {
      const commands = [];
      let arguments_ = [];
      let length = tool.length;
      for (const file of owned) {
        if (tool.length + file.length + 1 > maxCommandLength) {
          throw new RangeError('createLintStagedConfig: one file exceeds "maxCommandLength".');
        }
        if (arguments_.length === chunkSize || length + file.length + 1 > maxCommandLength) {
          commands.push(`${tool} ${arguments_.join(' ')}`);
          arguments_ = [];
          length = tool.length;
        }
        arguments_.push(file);
        length += file.length + 1;
      }
      if (arguments_.length > 0) {
        commands.push(`${tool} ${arguments_.join(' ')}`);
      }
      return commands;
    });
  };

export const createLintStagedConfig = ({
  eslintTarget = DEFAULT_TARGETS.eslintTarget,
  stylelintTarget = DEFAULT_TARGETS.stylelintTarget,
  prettierTarget = DEFAULT_TARGETS.prettierTarget,
  chunkSize,
  maxCommandLength,
  ignorePaths = [],
} = {}) => {
  if (
    !Array.isArray(ignorePaths) ||
    ignorePaths.some((pattern) => !(pattern instanceof RegExp) || pattern.global || pattern.sticky)
  ) {
    throw new TypeError('createLintStagedConfig: "ignorePaths" must contain non-stateful regular expressions.');
  }
  const chunked = chunkSize !== undefined || maxCommandLength !== undefined || ignorePaths.length > 0;
  const limits = {
    chunkSize: chunkSize ?? DEFAULT_CHUNK_SIZE,
    maxCommandLength: maxCommandLength ?? DEFAULT_MAX_COMMAND_LENGTH,
    ignorePaths,
  };
  assertPositiveInteger(limits.chunkSize, 'chunkSize');
  assertPositiveInteger(limits.maxCommandLength, 'maxCommandLength');
  const tasks = [
    [eslintTarget, ['eslint --fix --no-warn-ignored --max-warnings 0', PRETTIER_WRITE]],
    [stylelintTarget, ['stylelint --fix --max-warnings 0', PRETTIER_WRITE]],
    [prettierTarget, [PRETTIER_WRITE]],
  ];
  const config = {};
  for (const [target, tools] of tasks) {
    if (target === false) continue;
    if (typeof target !== 'string' || target.trim().length === 0) {
      throw new TypeError('createLintStagedConfig: targets must be non-empty strings or false.');
    }
    if (Object.hasOwn(config, target)) {
      throw new TypeError('createLintStagedConfig: targets must be distinct.');
    }
    config[target] = chunked ? createTask(tools, limits) : tools;
  }
  return config;
};

export const createChunkedLintStagedConfig = (options = {}) =>
  createLintStagedConfig({ ...options, chunkSize: options.chunkSize ?? DEFAULT_CHUNK_SIZE });

export const lintStagedConfig = createLintStagedConfig();

/**
 * Retains the published default export alongside the named configuration.
 * @alias lintStagedConfig
 */
export default lintStagedConfig;
