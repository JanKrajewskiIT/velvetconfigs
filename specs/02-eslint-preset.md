# Spec 02 — ESLint Preset

## Step 1 — Output shape

Create `eslint/index.mjs` exporting two factory functions and two selector-builder helpers. Factories return ESLint flat-config arrays produced via `defineConfig` from `eslint/config`. Static objects are not exported — every consumer must pass at minimum its TypeScript project root so the typed-rules layer can run.

Exports:

- `createEslintConfig` — Solid/browser baseline.
- `createNodeEslintConfig` — Node-side baseline (no Solid/a11y/css-modules plugins).
- `buildNoChildrenPropSelectors` — emits `no-restricted-syntax` selectors that forbid using `children` (or `title`) on specific components, used by consumers that want to enforce semantic prop names.
- `buildLiteralI18nKeySelectors` — emits selectors that forbid passing string literals to a dynamic translation function, steering consumers toward a separate static translation function.
- Convenience wrappers `buildNoChildrenPropRule` and `buildLiteralI18nKeyRule` returning fully-formed rule entries (severity + selectors) for direct use in `rules`.

## Step 2 — Default ignores and globs

The factories accept overrides but ship sensible defaults:

- Default ignores cover `dist`, `build`, `coverage`, all `.d.ts` files, and the Vite environment shim `vite-env.d.ts`.
- Default typed-file glob targets `src/**/*.{ts,tsx,js,jsx}`. The Node factory uses `src/**/*.{ts,js}` because there is no JSX.
- Default test-file glob covers `**/*.{test,spec}.*`, `**/__tests__/**`, and `**/test/**` across the TypeScript/JavaScript extensions.

Consumers may extend ignores via an `ignorePaths` option that is concatenated with the defaults rather than replacing them.

## Step 3 — Environment globals

The browser factory accepts an `environments` option (default: `['browser']`). Supported tokens map onto the corresponding entries from the `globals` package: `browser`, `node`, `worker`, `serviceworker`, `jest`, `vitest`. Tokens compose; passing multiple merges their globals.

The Node factory hardcodes Node globals on the typed-files layer; there is no environments option.

## Step 4 — Layer stack (Solid/browser factory)

The flat-config array assembled by `createEslintConfig` MUST be ordered as follows:

1. ESLint core `recommended` configuration.
2. jsx-a11y `flatConfigs.recommended`.
3. typescript-eslint `strictTypeChecked` profile (spread, multi-entry).
4. Solid plugin TypeScript flat-config preset.
5. `eslint-config-prettier` (last among presets so it can disable stylistic rules introduced earlier).
6. A `globalIgnores` entry combining defaults and consumer-provided paths.
7. A "config files" layer matching `*.{mjs,cjs,mts,cts}` and `*.config.{js,ts,mjs,cjs}`. This layer applies Node globals and disables type-checked rules via typescript-eslint's `disableTypeChecked`. Without this, running ESLint over the consumer's own `eslint.config.mjs` would fail type lookups.
8. The typed-source layer:
   - `files` set from the `typedFiles` option.
   - `languageOptions.parserOptions.projectService = true` and `tsconfigRootDir = options.tsconfigRootDir`. This enables project-service-based type-aware linting without forcing the consumer to maintain a static `parserOptions.project` array.
   - Globals composed via the environment merger.
   - Plugins: unused-imports, simple-import-sort, css-modules.
   - Rules described in Step 5.
9. A test-files layer that loosens type-strict rules so test fixtures, mocks, and assertion helpers do not require the same rigor as production code.
10. Any `extraConfigs` passed in by the consumer, appended last so they can override any earlier layer.

## Step 5 — Rule set (typed-source layer)

The typed layer must enable:

- `simple-import-sort/imports` and `.../exports` as errors. The two-rule combo replaces ESLint's built-in import ordering.
- `unused-imports/no-unused-imports` as error.
- `unused-imports/no-unused-vars` as error with `vars: 'all'`, `args: 'after-used'`, and a `^_` ignore pattern so prefixing with underscore opts out.
- Several typescript-eslint strict rules toned down to suit Solid idioms (return-type inference left to TS, unnecessary-type-arguments off, unnecessary-condition warn, misused-promises warn, restrict-template-expressions off, no-confusing-void-expression off, no-unsafe-type-assertion off).
- `require-unicode-regexp` with `requireFlag: 'u'` to make Unicode flags mandatory.
- `css-modules/no-undef-class` as warning and `css-modules/no-unused-class` as warning with camelCase awareness.
- `no-console`: by default `['error', { allow: ['warn', 'error'] }]`. Setting `allowConsoleWarnError: false` upgrades it to error for all log levels.
- `solid/reactivity` as warning (reactivity violations are noisy enough that errors block real refactors).

## Step 6 — Test-files relaxation

The test layer turns off the unsafe-\* family (`no-unsafe-assignment`, `-member-access`, `-call`, `-argument`, `-return`), `no-non-null-assertion`, `no-explicit-any`, `unbound-method`, and `no-console`. The intent is to keep production type strictness while making test ergonomics workable.

## Step 7 — Node-side factory differences

`createNodeEslintConfig` reuses the same scaffolding but drops Solid, jsx-a11y, and css-modules. The typed-source layer uses only Node globals, only `unused-imports` + `simple-import-sort` plugins, and the common rule set without the css-modules and solid entries.

## Step 8 — Required inputs

Both factories MUST throw a descriptive error if `tsconfigRootDir` is not provided. The typed-rules layer cannot function without it, and silent failure leads to confusing "missing project" errors deep inside typescript-eslint.

## Step 9 — Selector builder helpers

- `buildNoChildrenPropSelectors` walks an array of `{ component, prop, forbid }` entries. When `forbid` includes `'children'` it emits a JSX-element selector matching the named component with `selfClosing=false`. When `forbid` includes `'title'` it emits a JSX-attribute selector for the `title` attribute on the same component. Each selector carries a message naming the canonical replacement prop.
- `buildLiteralI18nKeySelectors` accepts a dynamic-function name (default `t`) and a static-function name (default `ts`). It emits two selectors that forbid passing a string literal — and a template literal with no interpolations — to the dynamic function, recommending the static function for compile-time-known keys.
- Both helpers return raw selector arrays; the rule-builder wrappers prepend `'error'` so the result drops directly into a rule entry.

## Step 10 — Documentation contract

The README must document at minimum:

- Both factories with one example each (browser + Node).
- The `tsconfigRootDir` requirement.
- The `environments` option and its allowed tokens.
- An example of extending rules via `extraConfigs` together with the selector-builder helpers.
