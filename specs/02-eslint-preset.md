# Spec 02 — ESLint Preset

## Step 1 — Output shape

Create `eslint/index.mjs` exporting two factory functions and two selector-builder helpers. Factories return ESLint flat-config arrays produced via `defineConfig` from `eslint/config`. Static objects are not exported — every consumer must pass at minimum its TypeScript project root so the typed-rules layer can run.

A sibling `eslint/index.d.mts` declares the public type surface (Step 11). The two files form one logical preset; the runtime artifact is the `.mjs`, the type artifact is the `.d.mts`.

Exports:

- `createEslintConfig` — Solid/browser baseline.
- `createNodeEslintConfig` — Node-side baseline (no Solid/a11y/css-modules plugins).
- `buildNoChildrenPropSelectors` — emits `no-restricted-syntax` selectors that forbid using `children` (or `title`) on specific components, used by consumers that want to enforce semantic prop names.
- `buildLiteralI18nKeySelectors` — emits selectors that forbid passing string literals to a dynamic translation function, steering consumers toward a separate static translation function.
- Convenience wrappers `buildNoChildrenPropRule` and `buildLiteralI18nKeyRule` returning fully-formed rule entries (severity + selectors) for direct use in `rules`.

## Step 2 — Default ignores and globs

The factories accept overrides but ship sensible defaults:

- Default ignores recursively cover `dist`, `build`, and `coverage` directories, all `.d.ts` files, the Vite environment shim `vite-env.d.ts`, and the agent-guidance directories `.agents`, `.claude`, `.codex`, and `.cursor` at the repository root.
- Default typed-file glob targets `src/**/*.{ts,tsx,js,jsx}`. The Node factory uses `src/**/*.{ts,js}` because there is no JSX.
- Default test-file globs cover `**/*.{test,spec}.*`, `**/__tests__/**`, and `**/test/**` across the TypeScript/JavaScript extensions, including `.mjs` and `.cjs`.

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
7. A "config files" layer recursively matching `**/*.{mjs,cjs,mts,cts}` and `**/*.config.{js,ts,mjs,cjs}`. This layer applies Node globals and disables type-checked rules via typescript-eslint's `disableTypeChecked`. Without this, running ESLint over nested workspace configuration files would fail type lookups.
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
- Several typescript-eslint strict rules toned down to suit Solid idioms (explicit function and module-boundary return types left to TS, unnecessary-type-arguments off, unnecessary-condition warn, misused-promises warn, restrict-template-expressions off, no-confusing-void-expression off, no-unsafe-type-assertion off).
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

## Step 11 — TypeScript declarations

The Vite and lint-staged presets ship `.d.mts` files alongside their `.mjs` factories (Specs 06–08). The ESLint preset MUST do the same. Consumers importing `createEslintConfig`, `createNodeEslintConfig`, `buildNoChildrenPropRule`, or `buildLiteralI18nKeyRule` from `@jankrajewskiit/configs/eslint` MUST receive precise types — never `any`.

The public surface declared in `eslint/index.d.mts`:

- `createEslintConfig(options: CreateEslintConfigOptions): FlatConfig[]`
- `createNodeEslintConfig(options: CreateNodeEslintConfigOptions): FlatConfig[]`
- `buildNoChildrenPropSelectors(entries: readonly NoChildrenPropEntry[]): RestrictedSyntaxSelector[]`
- `buildNoChildrenPropRule(entries: readonly NoChildrenPropEntry[]): RestrictedSyntaxRule`
- `buildLiteralI18nKeySelectors(options?: LiteralI18nKeyOptions): RestrictedSyntaxSelector[]`
- `buildLiteralI18nKeyRule(options?: LiteralI18nKeyOptions): RestrictedSyntaxRule`

The `FlatConfig` type aliases `eslint`'s `Linter.Config`. The preset MUST NOT redefine ESLint's config shape; it re-exports the upstream type to avoid drift across ESLint majors.

## Step 12 — Options interfaces

`CreateEslintConfigOptions` MUST declare:

- `tsconfigRootDir: string` — required at the type level (the runtime factory throws when it is missing, per Step 8).
- `typedFiles?: readonly string[]` — typed-source glob; defaults to `src/**/*.{ts,tsx,js,jsx}` (Step 2).
- `testFiles?: readonly string[]`
- `environments?: readonly EslintEnvironment[]` where `EslintEnvironment` is a string literal union mirroring the runtime validation in `mergeGlobals` (Step 3). Unknown tokens throw at runtime; the type narrows the surface so the throw is rare in practice.
- `ignorePaths?: readonly string[]` — appended to the preset's default ignores; does not replace them.
- `extraConfigs?: readonly FlatConfig[]`
- `allowConsoleWarnError?: boolean` — when `false`, the `no-console` rule disallows `warn`/`error` too; defaults to `true`.

`CreateNodeEslintConfigOptions` MUST declare the same shape without `environments` (the Node factory hardcodes Node globals per Step 7).

`NoChildrenPropEntry` MUST declare:

- `component: string`
- `prop: string`
- `forbid: readonly string[]`. An empty array is valid and produces no selectors. The runtime throws when an entry lacks a non-empty `component` or `prop`, or when `forbid` is not an array; unsupported values inside `forbid` are ignored.

`LiteralI18nKeyOptions` MUST declare:

- `dynamicFunction?: string` — default `'t'`. The dynamic function is the one the rule FLAGS when called with a literal argument; the convention is that `t()` is the runtime-keyed function whose arguments come from variables.
- `staticFunction?: string` — default `'ts'`. The static function is the one the rule's error message redirects consumers TOWARDS; the convention is that `ts('key')` is the compile-time-known counterpart.

`RestrictedSyntaxRule` MUST resolve to ESLint's `Linter.RuleEntry` shape so the consumer can spread it into `rules`.

## Step 13 — Export wiring

`package.json` exports map MUST declare the `./eslint` entry in conditional form, matching `./vite` and `./lint-staged`:

```json
"./eslint": {
  "types": "./eslint/index.d.mts",
  "import": "./eslint/index.mjs"
}
```

The `types` condition MUST appear before `import`, per publint's ordering rule (Spec 14 Step 8).

`files` already includes the `eslint` directory (Spec 01); no addition is required there.

## Step 14 — Type-only dependency

`eslint` is declared as an optional peer dependency (Spec 01). The `.d.mts` file imports types from `eslint` via `import type { Linter } from 'eslint';`. This is a type-only import; it does NOT pull `eslint` into the runtime graph and does NOT make the peer non-optional.

If a consumer imports the types without having `eslint` installed, TypeScript surfaces a clear `Cannot find module 'eslint'` error. This is the desired behaviour: the consumer needs ESLint installed to use the preset anyway.

## Step 15 — Self-hosting

The repository lints its JavaScript modules through a repo-local flat config (Spec 14 Step 1). It does not consume the published factory because doing so would create a self-dependency. The `.d.mts` is not covered by the JavaScript lint run and is not validated by an internal type-check. Declaration validation comes from:

- `publint` (Spec 14 Step 8) checks that the `types` condition resolves to an existing file.
- An optional `arethetypeswrong` check MAY be added to the verify pipeline; if added, it MUST run after `publint` and treat its findings as advisory until the preset stabilizes.

## Acceptance criteria

- Both factories reject a missing or non-string `tsconfigRootDir` and return the specified flat-config layers in the specified order for valid input.
- Browser environment tokens merge cumulatively; an unknown token throws. The Node factory always applies Node built-in globals and exposes no environment option.
- Default/extended ignores, typed globs, test globs, console policy, test relaxations, and `extraConfigs` precedence produce the specified effective rules.
- Selector helpers return the specified raw selectors/messages for `children`, `title`, string literals, and interpolation-free templates; wrappers prepend `error`.
- Runtime exports, declarations, package export conditions, and README examples expose the same public surface without `any`.
