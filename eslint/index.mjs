import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import solidPlugin from 'eslint-plugin-solid/configs/typescript';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import cssModulesPlugin from 'eslint-plugin-css-modules';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

const DEFAULT_IGNORES = ['dist', 'build', 'coverage', '**/vite-env.d.ts', '**/*.d.ts'];

const DEFAULT_TYPED_FILES = ['src/**/*.{ts,tsx,js,jsx}'];

const DEFAULT_TEST_FILES = [
  '**/*.{test,spec}.{ts,tsx,js,jsx}',
  '**/__tests__/**/*.{ts,tsx,js,jsx}',
  '**/test/**/*.{ts,tsx,js,jsx}',
];

const ENVIRONMENT_GLOBALS = {
  browser: globals.browser,
  node: globals.node,
  worker: globals.worker,
  serviceworker: globals.serviceworker,
  jest: globals.jest,
  vitest: globals.vitest ?? {},
};

function resolveEnvironmentGlobals(environments) {
  const merged = {};
  for (const env of environments) {
    Object.assign(merged, ENVIRONMENT_GLOBALS[env] ?? {});
  }
  return merged;
}

const COMMON_TS_RULES = {
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'error',
    {
      vars: 'all',
      varsIgnorePattern: '^_',
      args: 'after-used',
      argsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-unnecessary-type-arguments': 'off',
  '@typescript-eslint/no-unnecessary-condition': 'warn',
  '@typescript-eslint/no-unsafe-type-assertion': 'off',
  '@typescript-eslint/no-confusing-void-expression': 'off',
  '@typescript-eslint/restrict-template-expressions': 'off',
  '@typescript-eslint/no-misused-promises': 'warn',
  'require-unicode-regexp': ['error', { requireFlag: 'u' }],
};

const COMMON_TEST_RULES = {
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/unbound-method': 'off',
  'no-console': 'off',
};

const COMMON_PLUGINS = {
  'unused-imports': unusedImportsPlugin,
  'simple-import-sort': simpleImportSortPlugin,
};

/**
 * Generic ESLint flat-config factory for SolidJS + TypeScript projects.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir              - Root dir for projectService.
 * @param {string[]} [options.ignorePaths=[]]           - Extra ignore globs (merged with defaults).
 * @param {string[]} [options.environments=['browser']] - 'browser' | 'node' | 'worker' | 'serviceworker' | 'jest' | 'vitest'
 * @param {string[]} [options.typedFiles]               - Files that get type-aware linting (default: src/**).
 * @param {string[]} [options.testFiles]                - Files treated as tests (relaxed rules).
 * @param {boolean}  [options.allowConsoleWarnError=true] - Allow `console.warn` / `console.error`.
 * @param {Array}    [options.extraConfigs=[]]          - Extra flat-config entries appended at the end.
 */
export function createEslintConfig({
  tsconfigRootDir,
  ignorePaths = [],
  environments = ['browser'],
  typedFiles = DEFAULT_TYPED_FILES,
  testFiles = DEFAULT_TEST_FILES,
  allowConsoleWarnError = true,
  extraConfigs = [],
} = {}) {
  if (!tsconfigRootDir) {
    throw new Error('createEslintConfig: `tsconfigRootDir` is required.');
  }

  const envGlobals = resolveEnvironmentGlobals(environments);
  const consoleRule = allowConsoleWarnError ? ['error', { allow: ['warn', 'error'] }] : 'error';

  return defineConfig([
    eslint.configs.recommended,
    jsxA11yPlugin.flatConfigs.recommended,
    ...tseslint.configs.strictTypeChecked,
    solidPlugin,
    prettier,

    globalIgnores([...DEFAULT_IGNORES, ...ignorePaths]),

    // Non-typed config files: lint with basic rules only, no projectService.
    {
      files: ['**/*.{mjs,cjs,mts,cts}', '*.config.{js,ts,mjs,cjs}'],
      languageOptions: {
        globals: { ...globals.node },
      },
      ...tseslint.configs.disableTypeChecked,
    },

    // Typed config: src/**.
    {
      files: typedFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: envGlobals,
      },
      plugins: {
        ...COMMON_PLUGINS,
        'css-modules': cssModulesPlugin,
      },
      rules: {
        ...COMMON_TS_RULES,
        'css-modules/no-undef-class': 'warn',
        'css-modules/no-unused-class': ['warn', { camelCase: true }],
        'no-console': consoleRule,
        'solid/reactivity': 'warn',
      },
    },

    // Test files override: relax some strict rules.
    {
      files: testFiles,
      rules: COMMON_TEST_RULES,
    },

    ...extraConfigs,
  ]);
}

/**
 * Generic ESLint flat-config factory for Node-side TypeScript projects
 * (CLI tools, build scripts, server code without JSX/CSS Modules).
 *
 * Same baseline as `createEslintConfig` but skips the SolidJS, jsx-a11y and
 * css-modules plugins — keeps `typescript-eslint`, `unused-imports`,
 * `simple-import-sort`, and `prettier` integration.
 *
 * @param {object} options
 * @param {string} options.tsconfigRootDir
 * @param {string[]} [options.ignorePaths=[]]
 * @param {string[]} [options.typedFiles=['src/**\/*.{ts,js}']]
 * @param {string[]} [options.testFiles]
 * @param {boolean}  [options.allowConsoleWarnError=true]
 * @param {Array}    [options.extraConfigs=[]]
 */
export function createNodeEslintConfig({
  tsconfigRootDir,
  ignorePaths = [],
  typedFiles = ['src/**/*.{ts,js}'],
  testFiles = DEFAULT_TEST_FILES,
  allowConsoleWarnError = true,
  extraConfigs = [],
} = {}) {
  if (!tsconfigRootDir) {
    throw new Error('createNodeEslintConfig: `tsconfigRootDir` is required.');
  }

  const consoleRule = allowConsoleWarnError ? ['error', { allow: ['warn', 'error'] }] : 'error';

  return defineConfig([
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    prettier,

    globalIgnores([...DEFAULT_IGNORES, ...ignorePaths]),

    // Non-typed config files: lint with basic rules only, no projectService.
    {
      files: ['**/*.{mjs,cjs,mts,cts}', '*.config.{js,ts,mjs,cjs}'],
      languageOptions: {
        globals: { ...globals.node },
      },
      ...tseslint.configs.disableTypeChecked,
    },

    // Typed config: src/**.
    {
      files: typedFiles,
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: { ...globals.node },
      },
      plugins: COMMON_PLUGINS,
      rules: {
        ...COMMON_TS_RULES,
        'no-console': consoleRule,
      },
    },

    // Test files override.
    {
      files: testFiles,
      rules: COMMON_TEST_RULES,
    },

    ...extraConfigs,
  ]);
}

/**
 * Build a `no-restricted-syntax` rule entry that forbids passing JSX children
 * (or a `title` attribute) to components that should expose a dedicated prop.
 *
 * Each entry can be:
 *  - `{ component, prop }`                                 — forbids `<Comp>...</Comp>` (default)
 *  - `{ component, prop, forbid: 'title' }`                — forbids `title="..."` attribute
 *  - `{ component, prop, forbid: ['children', 'title'] }`  — both
 */
export function buildNoChildrenPropRule(entries) {
  return ['error', ...buildNoChildrenPropSelectors(entries)];
}

/** Selector list (without the 'error' severity) — for merging with other selectors. */
export function buildNoChildrenPropSelectors(entries) {
  const selectors = [];
  for (const entry of entries) {
    const forbid = Array.isArray(entry.forbid) ? entry.forbid : [entry.forbid ?? 'children'];
    if (forbid.includes('children')) {
      selectors.push({
        selector: `JSXElement[openingElement.name.name='${entry.component}'][openingElement.selfClosing=false]`,
        message: `Use \`${entry.prop}\` prop on ${entry.component} instead of children.`,
      });
    }
    if (forbid.includes('title')) {
      selectors.push({
        selector: `JSXAttribute[name.name='title'][parent.name.name='${entry.component}']`,
        message: `Use \`${entry.prop}\` prop on ${entry.component} instead of \`title\`.`,
      });
    }
  }
  return selectors;
}

/**
 * Selectors that disallow calling `t()` with a literal/static i18n key,
 * forcing callers to use `ts()` (typed-static) instead. Keep `t()` for
 * dynamic keys only.
 */
export function buildLiteralI18nKeySelectors({ dynamicFnName = 't', staticFnName = 'ts' } = {}) {
  return [
    {
      selector: `CallExpression[callee.name='${dynamicFnName}'][arguments.0.type='Literal'][arguments.0.value!=null]`,
      message: `Use \`${staticFnName}()\` for literal i18n keys. Keep \`${dynamicFnName}()\` for dynamic keys only.`,
    },
    {
      selector: `CallExpression[callee.name='${dynamicFnName}'][arguments.0.type='TemplateLiteral'][arguments.0.expressions.length=0]`,
      message: `Use \`${staticFnName}()\` for literal i18n keys. Keep \`${dynamicFnName}()\` for dynamic keys only.`,
    },
  ];
}

export function buildLiteralI18nKeyRule(options) {
  return ['error', ...buildLiteralI18nKeySelectors(options)];
}
