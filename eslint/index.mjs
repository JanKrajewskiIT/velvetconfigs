import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import cssModules from 'eslint-plugin-css-modules';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import solid from 'eslint-plugin-solid';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';
import typescriptEslint from 'typescript-eslint';

const DEFAULT_IGNORES = ['**/dist/**', '**/build/**', '**/coverage/**', '**/*.d.ts', '**/vite-env.d.ts'];
const DEFAULT_BROWSER_FILES = ['src/**/*.{ts,tsx,js,jsx}'];
const DEFAULT_NODE_FILES = ['src/**/*.{ts,js}'];
const DEFAULT_TEST_FILES = [
  '**/*.{test,spec}.{ts,tsx,js,jsx,mjs,cjs}',
  '**/__tests__/**/*.{ts,tsx,js,jsx,mjs,cjs}',
  '**/test/**/*.{ts,tsx,js,jsx,mjs,cjs}',
];
const CONFIG_FILES = ['**/*.{mjs,cjs,mts,cts}', '**/*.config.{js,ts,mjs,cjs}'];
const ENVIRONMENT_GLOBALS = {
  browser: globals.browser,
  node: globals.node,
  worker: globals.worker,
  serviceworker: globals.serviceworker,
  jest: globals.jest,
  vitest: globals.vitest,
};

const validateOptions = (options) => {
  if (typeof options?.tsconfigRootDir !== 'string' || options.tsconfigRootDir.length === 0) {
    throw new TypeError('tsconfigRootDir must be a non-empty string.');
  }
};

const mergeGlobals = (environments) =>
  environments.reduce((mergedGlobals, environment) => {
    const environmentGlobals = ENVIRONMENT_GLOBALS[environment];

    if (!environmentGlobals) {
      throw new TypeError(`Unsupported ESLint environment: ${environment}`);
    }

    return { ...mergedGlobals, ...environmentGlobals };
  }, {});

const createCommonRules = (allowConsoleWarnError) => ({
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
  'no-console': allowConsoleWarnError ? ['error', { allow: ['warn', 'error'] }] : 'error',
});

const TEST_RULES = {
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

const createConfigFilesLayer = () => ({
  ...typescriptEslint.configs.disableTypeChecked,
  files: CONFIG_FILES,
  languageOptions: {
    ...typescriptEslint.configs.disableTypeChecked.languageOptions,
    globals: globals.node,
  },
});

export const createEslintConfig = (options) => {
  validateOptions(options);

  const {
    typedFiles = DEFAULT_BROWSER_FILES,
    testFiles = DEFAULT_TEST_FILES,
    environments = ['browser'],
    ignorePaths = [],
    extraConfigs = [],
    allowConsoleWarnError = true,
    tsconfigRootDir,
  } = options;

  return defineConfig(
    eslint.configs.recommended,
    jsxA11y.flatConfigs.recommended,
    ...typescriptEslint.configs.strictTypeChecked,
    solid.configs['flat/typescript'],
    eslintConfigPrettier,
    globalIgnores([...DEFAULT_IGNORES, ...ignorePaths]),
    createConfigFilesLayer(),
    {
      files: [...typedFiles],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: mergeGlobals(environments),
      },
      plugins: {
        'css-modules': cssModules,
        'simple-import-sort': simpleImportSort,
        'unused-imports': unusedImports,
      },
      rules: {
        ...createCommonRules(allowConsoleWarnError),
        'css-modules/no-undef-class': 'warn',
        'css-modules/no-unused-class': ['warn', { camelCase: true }],
        'solid/reactivity': 'warn',
      },
    },
    {
      files: [...testFiles],
      rules: TEST_RULES,
    },
    ...extraConfigs,
  );
};

export const createNodeEslintConfig = (options) => {
  validateOptions(options);

  const {
    typedFiles = DEFAULT_NODE_FILES,
    testFiles = DEFAULT_TEST_FILES,
    ignorePaths = [],
    extraConfigs = [],
    allowConsoleWarnError = true,
    tsconfigRootDir,
  } = options;

  return defineConfig(
    eslint.configs.recommended,
    ...typescriptEslint.configs.strictTypeChecked,
    eslintConfigPrettier,
    globalIgnores([...DEFAULT_IGNORES, ...ignorePaths]),
    createConfigFilesLayer(),
    {
      files: [...typedFiles],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: globals.node,
      },
      plugins: {
        'simple-import-sort': simpleImportSort,
        'unused-imports': unusedImports,
      },
      rules: createCommonRules(allowConsoleWarnError),
    },
    {
      files: [...testFiles],
      rules: TEST_RULES,
    },
    ...extraConfigs,
  );
};

export const buildNoChildrenPropSelectors = (entries) =>
  entries.flatMap((entry) => {
    if (typeof entry?.component !== 'string' || entry.component.length === 0) {
      throw new TypeError('component must be a non-empty string.');
    }

    if (typeof entry.prop !== 'string' || entry.prop.length === 0) {
      throw new TypeError('prop must be a non-empty string.');
    }

    if (!Array.isArray(entry.forbid)) {
      throw new TypeError('forbid must be an array.');
    }

    const component = JSON.stringify(entry.component);
    const selectors = [];

    if (entry.forbid.includes('children')) {
      selectors.push({
        selector: `JSXOpeningElement[name.name=${component}][selfClosing=false]`,
        message: `Use the ${entry.prop} prop instead of children on ${entry.component}.`,
      });
    }

    if (entry.forbid.includes('title')) {
      selectors.push({
        selector: `JSXOpeningElement[name.name=${component}] > JSXAttribute[name.name='title']`,
        message: `Use the ${entry.prop} prop instead of title on ${entry.component}.`,
      });
    }

    return selectors;
  });

export const buildNoChildrenPropRule = (entries) => ['error', ...buildNoChildrenPropSelectors(entries)];

export const buildLiteralI18nKeySelectors = ({ dynamicFunction = 't', staticFunction = 'ts' } = {}) => {
  if (typeof dynamicFunction !== 'string' || dynamicFunction.length === 0) {
    throw new TypeError('dynamicFunction must be a non-empty string.');
  }

  if (typeof staticFunction !== 'string' || staticFunction.length === 0) {
    throw new TypeError('staticFunction must be a non-empty string.');
  }

  const dynamicFunctionName = JSON.stringify(dynamicFunction);
  const message = `Use ${staticFunction}() for compile-time-known translation keys.`;

  return [
    {
      selector: `CallExpression[callee.name=${dynamicFunctionName}] > Literal:first-child`,
      message,
    },
    {
      selector: `CallExpression[callee.name=${dynamicFunctionName}] > TemplateLiteral[expressions.length=0]:first-child`,
      message,
    },
  ];
};

export const buildLiteralI18nKeyRule = (options) => ['error', ...buildLiteralI18nKeySelectors(options)];
