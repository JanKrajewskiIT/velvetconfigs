# Spec 08 — lint-staged Preset

## Step 1 — Module shape

Create `lint-staged/index.mjs` exporting:

- `createLintStagedConfig` — factory returning a lint-staged config object.
- `lintStagedConfig` — the result of calling the factory with no arguments (named export).
- A default export equal to `lintStagedConfig`, so consumers can write `export { default } from '<package>/lint-staged'` in their own config file.

Add `lint-staged/index.d.mts` with the matching type declarations.

## Step 2 — Default targets

The factory accepts three glob options, each with a default:

- `eslintTarget` — default `'*.{js,jsx,ts,tsx,mjs,cjs}'`. Files matched here run ESLint with `--fix --no-warn-ignored` followed by Prettier write.
- `prettierTarget` — default `'*.{json,md,yml,yaml,html}'`. Files matched here run Prettier write only.
- `stylelintTarget` — default `'*.css'`. Files matched here run Stylelint with `--fix` followed by Prettier write.

The factory returns a plain object mapping each glob to its commands array. Commands are passed to lint-staged verbatim.

## Step 3 — Tool ordering rules

Within each glob, tools MUST run in this order:

- ESLint or Stylelint (with `--fix`) first so auto-fixable rule violations are repaired before formatting.
- Prettier write last so it has the final say on formatting and re-formats anything the linters touched.

Mixing the order produces fights between Stylelint/ESLint stylistic rules and Prettier; running Prettier last while pairing the preset with `eslint-config-prettier` (Spec 02) and the Stylelint preset (Spec 04) eliminates conflicts.

## Step 4 — Customizing globs

Consumers can pass any of the three target options to widen or narrow scope. Example use cases the factory must support:

- A monorepo that needs to scope lint-staged to a sub-package — the consumer passes globs prefixed with the package path.
- A repository that does not author CSS at all — the consumer can leave the default Stylelint glob in place; it simply matches nothing.
- A project that uses additional Prettier-formattable extensions (e.g. SVG, GraphQL) — the consumer widens `prettierTarget`.

The factory does NOT validate the globs; lint-staged consumes them.

## Step 5 — Type declarations

`lint-staged/index.d.mts` exports:

- `CreateLintStagedConfigOptions` interface listing the three target overrides as optional strings.
- `LintStagedConfig` type alias as `Record<string, string[]>`.
- `createLintStagedConfig(options?)` signature returning `LintStagedConfig`.
- `lintStagedConfig` named-value declaration of type `LintStagedConfig`.
- Default export typed as `LintStagedConfig`.

## Step 6 — Consumer wiring

A consumer's `lint-staged.config.mjs` typically does one of:

- Re-export the default: a single re-export line yields the package's default config in the consumer's repository.
- Construct a custom config: call `createLintStagedConfig` with overrides and export the result as default.

The lint-staged binary discovers the config automatically; no additional flags are needed.

## Step 7 — Export entry

The exports map exposes `./lint-staged` as a conditional export with `types` pointing at `lint-staged/index.d.mts` and `import` pointing at `lint-staged/index.mjs`.

## Step 8 — Interaction with Husky

The lint-staged preset is invoked by the Husky pre-commit hook described in Spec 09. The factory itself does not know about Husky; it produces a config consumed by the lint-staged binary, which the hook executes.
