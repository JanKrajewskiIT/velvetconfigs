import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import solid from 'eslint-plugin-solid/configs/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import cssModules from 'eslint-plugin-css-modules';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const DEFAULT_IGNORES = ['**/dist/**', '**/build/**', '**/coverage/**', '**/*.d.ts', '**/vite-env.d.ts'];

const DEFAULT_TYPED_FILES_BROWSER = ['src/**/*.{ts,tsx,js,jsx}'];
const DEFAULT_TYPED_FILES_NODE = ['src/**/*.{ts,js}'];

const DEFAULT_TEST_FILES = [
  '**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}',
  '**/__tests__/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  '**/test/**/*.{ts,tsx,js,jsx,mjs,cjs}',
];

const CONFIG_FILES = ['**/*.{mjs,cjs,mts,cts}', '**/*.config.{js,ts,mjs,cjs}'];

const SUPPORTED_ENVIRONMENTS = {
  browser: globals.browser,
  node: globals.nodeBuiltin ?? globals.node,
  worker: globals.worker,
  serviceworker: globals.serviceworker,
  jest: globals.jest,
  vitest: globals.vitest ?? {},
};

function mergeGlobals(environments) {
  const merged = {};
  for (const token of environments) {
    const set = SUPPORTED_ENVIRONMENTS[token];
    if (!set) {
      throw new Error(`Unknown environment "${token}". Supported: ${Object.keys(SUPPORTED_ENVIRONMENTS).join(', ')}.`);
    }
    Object.assign(merged, set);
  }
  return merged;
}

function requireTsconfigRootDir(value) {
  if (!value || typeof value !== 'string') {
    throw new Error(
      'createEslintConfig: tsconfigRootDir is required. Pass an absolute path to the directory containing tsconfig.json (typically `import.meta.dirname`).',
    );
  }
  return value;
}

const COMMON_RULES = {
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'error',
    {
      vars: 'all',
      args: 'after-used',
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-unnecessary-type-arguments': 'off',
  '@typescript-eslint/no-unnecessary-condition': 'warn',
  '@typescript-eslint/no-misused-promises': 'warn',
  '@typescript-eslint/restrict-template-expressions': 'off',
  '@typescript-eslint/no-confusing-void-expression': 'off',
  '@typescript-eslint/no-unsafe-type-assertion': 'off',
  'require-unicode-regexp': ['error', { requireFlag: 'u' }],
};

const TEST_RELAXATIONS = {
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/unbound-method': 'off',
  'no-console': 'off',
};

function consoleRule(allowConsoleWarnError) {
  if (allowConsoleWarnError === false) {
    return ['error'];
  }
  return ['error', { allow: ['warn', 'error'] }];
}

export function createEslintConfig(options = {}) {
  const tsconfigRootDir = requireTsconfigRootDir(options.tsconfigRootDir);
  const environments = options.environments ?? ['browser'];
  const typedFiles = options.typedFiles ?? DEFAULT_TYPED_FILES_BROWSER;
  const testFiles = options.testFiles ?? DEFAULT_TEST_FILES;
  const ignorePaths = [...DEFAULT_IGNORES, ...(options.ignorePaths ?? [])];
  const extraConfigs = options.extraConfigs ?? [];
  const allowConsoleWarnError = options.allowConsoleWarnError;

  const typedGlobals = mergeGlobals(environments);

  return defineConfig([
    js.configs.recommended,
    jsxA11y.flatConfigs.recommended,
    ...tseslint.configs.strictTypeChecked,
    solid,
    prettierConfig,
    globalIgnores(ignorePaths),
    {
      files: CONFIG_FILES,
      languageOptions: {
        globals: { ...globals.nodeBuiltin },
      },
      ...tseslint.configs.disableTypeChecked,
    },
    {
      files: typedFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: typedGlobals,
      },
      plugins: {
        'unused-imports': unusedImports,
        'simple-import-sort': simpleImportSort,
        'css-modules': cssModules,
      },
      rules: {
        ...COMMON_RULES,
        'css-modules/no-undef-class': ['warn', { camelCase: true }],
        'css-modules/no-unused-class': ['warn', { camelCase: true }],
        'no-console': consoleRule(allowConsoleWarnError),
        'solid/reactivity': 'warn',
      },
    },
    {
      files: testFiles,
      rules: TEST_RELAXATIONS,
    },
    ...extraConfigs,
  ]);
}

export function createNodeEslintConfig(options = {}) {
  const tsconfigRootDir = requireTsconfigRootDir(options.tsconfigRootDir);
  const typedFiles = options.typedFiles ?? DEFAULT_TYPED_FILES_NODE;
  const testFiles = options.testFiles ?? DEFAULT_TEST_FILES;
  const ignorePaths = [...DEFAULT_IGNORES, ...(options.ignorePaths ?? [])];
  const extraConfigs = options.extraConfigs ?? [];
  const allowConsoleWarnError = options.allowConsoleWarnError;

  return defineConfig([
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    prettierConfig,
    globalIgnores(ignorePaths),
    {
      files: CONFIG_FILES,
      languageOptions: {
        globals: { ...globals.nodeBuiltin },
      },
      ...tseslint.configs.disableTypeChecked,
    },
    {
      files: typedFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: { ...globals.nodeBuiltin },
      },
      plugins: {
        'unused-imports': unusedImports,
        'simple-import-sort': simpleImportSort,
      },
      rules: {
        ...COMMON_RULES,
        'no-console': consoleRule(allowConsoleWarnError),
      },
    },
    {
      files: testFiles,
      rules: TEST_RELAXATIONS,
    },
    ...extraConfigs,
  ]);
}

export function buildNoChildrenPropSelectors(entries) {
  const selectors = [];
  for (const entry of entries) {
    const { component, prop, forbid } = entry;
    if (!component || !prop || !Array.isArray(forbid)) {
      throw new Error('buildNoChildrenPropSelectors: each entry must have { component, prop, forbid: [...] }.');
    }
    if (forbid.includes('children')) {
      selectors.push({
        selector: `JSXElement[openingElement.name.name='${component}'][openingElement.selfClosing=false]`,
        message: `Pass content via the "${prop}" prop on <${component}/> instead of children.`,
      });
    }
    if (forbid.includes('title')) {
      selectors.push({
        selector: `JSXAttribute[name.name='title'][parent.name.name='${component}']`,
        message: `Use the "${prop}" prop on <${component}/> instead of the title attribute.`,
      });
    }
  }
  return selectors;
}

export function buildLiteralI18nKeySelectors(options = {}) {
  const dynamic = options.dynamicFunction ?? 't';
  const staticFn = options.staticFunction ?? 'ts';
  const message = `Use ${staticFn}('key') for compile-time-known keys; ${dynamic}() is for dynamic lookups.`;
  return [
    {
      selector: `CallExpression[callee.name='${dynamic}'] > Literal:first-child`,
      message,
    },
    {
      selector: `CallExpression[callee.name='${dynamic}'] > TemplateLiteral:first-child[expressions.length=0]`,
      message,
    },
  ];
}

export function buildNoChildrenPropRule(entries) {
  return ['error', ...buildNoChildrenPropSelectors(entries)];
}

export function buildLiteralI18nKeyRule(options) {
  return ['error', ...buildLiteralI18nKeySelectors(options)];
}
