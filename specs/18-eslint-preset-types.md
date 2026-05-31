# Spec 18 — TypeScript Types for the ESLint Preset

## Step 1 — Principle

The Vite and lint-staged presets ship `.d.mts` files alongside their `.mjs` factories (Specs 06–08). The ESLint preset does not. Consumers importing `createEslintConfig`, `createNodeEslintConfig`, `buildNoChildrenPropRule`, or `buildLiteralI18nKeyRule` from `@jankrajewskiit/configs/eslint` receive `any`.

A TypeScript-first preset library MUST type every public export. This spec adds `eslint/index.d.mts` and wires it into the exports map.

## Step 2 — Public surface to type

The following exports MUST appear in `eslint/index.d.mts`:

- `createEslintConfig(options: CreateEslintConfigOptions): FlatConfig[]`
- `createNodeEslintConfig(options: CreateNodeEslintConfigOptions): FlatConfig[]`
- `buildNoChildrenPropSelectors(entries: readonly NoChildrenPropEntry[]): RestrictedSyntaxSelector[]`
- `buildNoChildrenPropRule(entries: readonly NoChildrenPropEntry[]): RestrictedSyntaxRule`
- `buildLiteralI18nKeySelectors(options?: LiteralI18nKeyOptions): RestrictedSyntaxSelector[]`
- `buildLiteralI18nKeyRule(options?: LiteralI18nKeyOptions): RestrictedSyntaxRule`

The `FlatConfig` type aliases `eslint`'s `Linter.Config`. The preset MUST NOT redefine ESLint's config shape; it re-exports the upstream type to avoid drift across ESLint majors.

## Step 3 — Options interfaces

`CreateEslintConfigOptions` MUST declare:

- `tsconfigRootDir: string` — required at the type level (the runtime factory throws when it is missing).
- `typedFiles?: readonly string[]` — typed-source glob; defaults to `src/**/*.{ts,tsx,js,jsx}`.
- `testFiles?: readonly string[]`
- `environments?: readonly EslintEnvironment[]` where `EslintEnvironment` is a string literal union mirroring the runtime validation in `mergeGlobals` (Spec 02). Unknown tokens throw at runtime; the type narrows the surface so the throw is rare in practice.
- `ignorePaths?: readonly string[]` — appended to the preset's default ignores; does not replace them.
- `extraConfigs?: readonly FlatConfig[]`
- `allowConsoleWarnError?: boolean` — when `false`, the `no-console` rule disallows `warn`/`error` too; defaults to `true`.

`CreateNodeEslintConfigOptions` MUST declare the same shape without `environments` (the Node factory hardcodes Node globals per Spec 02 Step 7).

`NoChildrenPropEntry` MUST declare:

- `component: string`
- `prop: string`
- `forbid: readonly string[]` — non-empty at the type level via a branded helper if practical, otherwise validated at runtime (preferred to stay simple).

`LiteralI18nKeyOptions` MUST declare:

- `dynamicFunction?: string` — default `'t'`. The dynamic function is the one the rule FLAGS when called with a literal argument; the convention is that `t()` is the runtime-keyed function whose arguments come from variables.
- `staticFunction?: string` — default `'ts'`. The static function is the one the rule's error message redirects consumers TOWARDS; the convention is that `ts('key')` is the compile-time-known counterpart.

`RestrictedSyntaxRule` MUST resolve to ESLint's `Linter.RuleEntry` shape so the consumer can spread it into `rules`.

## Step 4 — Export wiring

`package.json` exports map MUST upgrade the `./eslint` entry to conditional form, matching `./vite` and `./lint-staged`:

```json
"./eslint": {
  "types": "./eslint/index.d.mts",
  "import": "./eslint/index.mjs"
}
```

The `types` condition MUST appear before `import`, per publint's ordering rule (Spec 14 Step 7).

`files` already includes the `eslint` directory; no addition is required there.

## Step 5 — Type-only dependency

`eslint` is already declared as an optional peer dependency (Spec 01). The `.d.mts` file imports types from `eslint` via `import type { Linter } from 'eslint';`. This is a type-only import; it does NOT pull `eslint` into the runtime graph and does NOT make the peer non-optional.

If a consumer imports the types without having `eslint` installed, TypeScript surfaces a clear `Cannot find module 'eslint'` error. This is the desired behaviour: the consumer needs ESLint installed to use the preset anyway.

## Step 6 — Self-hosting

The repository does not lint its own ESLint preset (Spec 14 Step 1). The `.d.mts` is therefore not validated by an internal type-check. Validation comes from:

- `publint` (Spec 14 Step 7) checks that the `types` condition resolves to an existing file.
- An optional `arethetypeswrong` check MAY be added to the verify pipeline; if added, it MUST run after `publint` and treat its findings as advisory until the preset stabilizes.

## Step 7 — Backwards compatibility

The change is additive at runtime. Existing consumers who imported the factory continue to work; they merely gain types where they previously had `any`. No release-note migration entry is required beyond noting "ESLint preset now ships types" in the changelog.
