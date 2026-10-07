import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import cssModules from 'eslint-plugin-css-modules';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import solid from 'eslint-plugin-solid';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const SOURCE_EXTENSIONS = 'js,jsx,ts,tsx,mjs,cjs,mts,cts';
const UNUSED_IGNORE_PATTERN = '^_';

const DEFAULT_IGNORES = ['**/dist/**', '**/build/**', '**/coverage/**', '**/*.d.ts'];
const DEFAULT_BROWSER_TYPED_FILES = ['src/**/*.{ts,tsx,js,jsx}'];
const DEFAULT_NODE_TYPED_FILES = ['src/**/*.{ts,js}'];
const DEFAULT_TEST_FILES = [
  `**/*.{test,spec}.{${SOURCE_EXTENSIONS}}`,
  `**/__tests__/**/*.{${SOURCE_EXTENSIONS}}`,
  `**/test/**/*.{${SOURCE_EXTENSIONS}}`,
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
const DEFAULT_ENVIRONMENTS = ['browser'];

const CSS_MODULES_OPTIONS = { camelCase: true };
const BROWSER_ONLY_RULES = {
  'css-modules/no-undef-class': ['warn', CSS_MODULES_OPTIONS],
  'css-modules/no-unused-class': ['warn', CSS_MODULES_OPTIONS],
};

// eslint-plugin-css-modules still calls context.getFilename(), which ESLint 10 removed.
const withGetFilename = (rule) => ({
  ...rule,
  create: (context) =>
    rule.create(
      new Proxy(context, {
        get: (target, property) => (property === 'getFilename' ? () => target.filename : Reflect.get(target, property)),
      }),
    ),
});
const cssModulesPlugin = {
  ...cssModules,
  rules: Object.fromEntries(Object.entries(cssModules.rules).map(([name, rule]) => [name, withGetFilename(rule)])),
};

const UNSAFE_RULE_KINDS = ['assignment', 'member-access', 'call', 'argument', 'return'];
const TEST_FILE_RULES = Object.fromEntries(
  [
    ...UNSAFE_RULE_KINDS.map((kind) => `@typescript-eslint/no-unsafe-${kind}`),
    '@typescript-eslint/no-non-null-assertion',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/unbound-method',
    'no-console',
  ].map((rule) => [rule, 'off']),
);

const NO_CHILDREN_SELECTOR_BUILDERS = {
  children: ({ component, prop }) => ({
    selector: `JSXElement[openingElement.name.name=${JSON.stringify(component)}][openingElement.selfClosing=false]`,
    message: `Do not pass children to <${component}>; use the "${prop}" prop instead.`,
  }),
  title: ({ component, prop }) => ({
    selector: `JSXOpeningElement[name.name=${JSON.stringify(component)}] > JSXAttribute[name.name="title"]`,
    message: `Do not pass "title" to <${component}>; use the "${prop}" prop instead.`,
  }),
};

const assertNonEmptyString = (value, label) => {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
};

const mergeGlobals = (environments) => {
  if (!Array.isArray(environments)) {
    throw new TypeError('createEslintConfig: "environments" must be an array.');
  }
  const allowed = Object.keys(ENVIRONMENT_GLOBALS);
  const unknown = environments.filter((token) => !Object.hasOwn(ENVIRONMENT_GLOBALS, token));
  if (unknown.length > 0) {
    throw new Error(
      `createEslintConfig: unknown environment ${unknown.map((token) => JSON.stringify(token)).join(', ')}. ` +
        `Allowed values: ${allowed.join(', ')}.`,
    );
  }
  return Object.assign({}, ...environments.map((token) => ENVIRONMENT_GLOBALS[token]));
};

const resolveOptions = (factoryName, options, defaultTypedFiles) => {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError(`${factoryName}: options object with "tsconfigRootDir" is required.`);
  }
  assertNonEmptyString(options.tsconfigRootDir, `${factoryName}: "tsconfigRootDir"`);
  const {
    tsconfigRootDir,
    typedFiles = defaultTypedFiles,
    testFiles = DEFAULT_TEST_FILES,
    ignorePaths = [],
    extraConfigs = [],
    allowConsoleWarnError = true,
  } = options;
  return { tsconfigRootDir, typedFiles, testFiles, ignorePaths, extraConfigs, allowConsoleWarnError };
};

const buildSharedRules = ({ allowConsoleWarnError }) => ({
  'simple-import-sort/imports': 'error',
  'simple-import-sort/exports': 'error',
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': [
    'error',
    {
      vars: 'all',
      args: 'after-used',
      varsIgnorePattern: UNUSED_IGNORE_PATTERN,
      argsIgnorePattern: UNUSED_IGNORE_PATTERN,
      caughtErrorsIgnorePattern: UNUSED_IGNORE_PATTERN,
    },
  ],
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  '@typescript-eslint/no-unnecessary-type-arguments': 'off',
  '@typescript-eslint/no-unnecessary-condition': 'warn',
  '@typescript-eslint/no-misused-promises': 'warn',
  '@typescript-eslint/restrict-template-expressions': 'off',
  '@typescript-eslint/no-confusing-void-expression': 'off',
  '@typescript-eslint/no-unsafe-type-assertion': 'off',
  'require-unicode-regexp': ['error', { requireFlag: 'u' }],
  'no-console': allowConsoleWarnError ? ['error', { allow: ['warn', 'error'] }] : 'error',
});

const scopeTypeAwareRules = (typedFiles) =>
  tseslint.configs.strictTypeChecked.map((config) =>
    config.rules !== undefined && config.files === undefined ? { ...config, files: typedFiles } : config,
  );

const createConfig = ({ options, presets, plugins, rules, typedGlobals }) =>
  defineConfig(
    ...presets(scopeTypeAwareRules(options.typedFiles)),
    eslintConfigPrettier,
    globalIgnores([...DEFAULT_IGNORES, ...options.ignorePaths]),
    {
      name: 'configs/config-files',
      files: CONFIG_FILES,
      extends: [tseslint.configs.disableTypeChecked],
      languageOptions: { globals: globals.node },
    },
    {
      name: 'configs/typed-sources',
      files: options.typedFiles,
      languageOptions: {
        globals: typedGlobals,
        parserOptions: { projectService: true, tsconfigRootDir: options.tsconfigRootDir },
      },
      plugins: { 'unused-imports': unusedImports, 'simple-import-sort': simpleImportSort, ...plugins },
      rules: { ...buildSharedRules(options), ...rules },
    },
    { name: 'configs/test-files', files: options.testFiles, rules: TEST_FILE_RULES },
    ...options.extraConfigs,
  );

export const createEslintConfig = (options) => {
  const resolved = resolveOptions('createEslintConfig', options, DEFAULT_BROWSER_TYPED_FILES);
  return createConfig({
    options: resolved,
    presets: (typescript) => [
      js.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      ...typescript,
      solid.configs['flat/typescript'],
    ],
    plugins: { 'css-modules': cssModulesPlugin },
    rules: BROWSER_ONLY_RULES,
    typedGlobals: mergeGlobals(options.environments ?? DEFAULT_ENVIRONMENTS),
  });
};

export const createNodeEslintConfig = (options) => {
  const resolved = resolveOptions('createNodeEslintConfig', options, DEFAULT_NODE_TYPED_FILES);
  return createConfig({
    options: resolved,
    presets: (typescript) => [js.configs.recommended, ...typescript],
    plugins: {},
    rules: {},
    typedGlobals: globals.node,
  });
};

const assertNoChildrenPropEntry = (entry) => {
  if (typeof entry !== 'object' || entry === null) {
    throw new TypeError('buildNoChildrenPropSelectors: each entry must be an object.');
  }
  assertNonEmptyString(entry.component, 'buildNoChildrenPropSelectors: "component"');
  assertNonEmptyString(entry.prop, 'buildNoChildrenPropSelectors: "prop"');
  if (!Array.isArray(entry.forbid)) {
    throw new TypeError('buildNoChildrenPropSelectors: "forbid" must be an array.');
  }
};

export const buildNoChildrenPropSelectors = (entries) => {
  if (!Array.isArray(entries)) {
    throw new TypeError('buildNoChildrenPropSelectors: entries must be an array.');
  }
  return entries.flatMap((entry) => {
    assertNoChildrenPropEntry(entry);
    return Object.entries(NO_CHILDREN_SELECTOR_BUILDERS)
      .filter(([token]) => entry.forbid.includes(token))
      .map(([, build]) => build(entry));
  });
};

export const buildNoChildrenPropRule = (entries) => ['error', ...buildNoChildrenPropSelectors(entries)];

export const buildLiteralI18nKeySelectors = ({ dynamicFunction = 't', staticFunction = 'ts' } = {}) => {
  assertNonEmptyString(dynamicFunction, 'buildLiteralI18nKeySelectors: "dynamicFunction"');
  assertNonEmptyString(staticFunction, 'buildLiteralI18nKeySelectors: "staticFunction"');
  const call = `CallExpression[callee.name=${JSON.stringify(dynamicFunction)}]`;
  const message = `Pass keys known at compile time to ${staticFunction}(); ${dynamicFunction}() is for keys computed at runtime.`;
  return [
    { selector: `${call}[arguments.0.type="Literal"][arguments.0.value=type(string)]`, message },
    { selector: `${call}[arguments.0.type="TemplateLiteral"][arguments.0.expressions.length=0]`, message },
  ];
};

export const buildLiteralI18nKeyRule = (options) => ['error', ...buildLiteralI18nKeySelectors(options)];
