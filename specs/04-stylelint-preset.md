# Spec 04 — Stylelint Preset

## Step 1 — Format

The Stylelint preset is a single JSON file at `stylelint/index.json`. Stylelint consumes it through the `"stylelint"` field in a consumer's `package.json` or via an `.stylelintrc*` file with the `extends` key. JSON keeps the artifact ESM-neutral and human-readable.

## Step 2 — Base configuration

The preset MUST extend `stylelint-config-standard`. The standard config provides the bulk of modern CSS rules; the preset only overlays the deltas the project insists on.

## Step 3 — Naming conventions

- Class selectors must match `^[a-z][a-zA-Z0-9]*$` with a custom message ("Expected class selector to be camelCase"). CSS Modules generate scoped class names from these identifiers, and camelCase keeps consumption from TypeScript ergonomic (no bracket access).
- Keyframe names follow the same camelCase pattern with a parallel message.
- Custom property naming is intentionally LEFT UNRESTRICTED (`custom-property-pattern: null`) so design tokens can use kebab-case or namespaced patterns without the preset getting in the way.

## Step 4 — Specificity and selector hygiene

- `no-descending-specificity` is disabled. The rule produces frequent false positives in component-scoped CSS Modules and offers limited benefit in scoped contexts.
- `no-duplicate-selectors` is enabled to catch genuine duplication.
- `selector-pseudo-class-no-unknown` is enabled but allows `:global` so CSS Modules consumers can escape scoping.

## Step 5 — Declarations

- `declaration-block-no-redundant-longhand-properties` is enabled.
- `shorthand-property-no-redundant-values` is enabled.
- `property-no-vendor-prefix` is enabled with an `ignoreProperties` allowlist for the small set of properties that still require vendor prefixes in production (e.g. `backface-visibility`).
- `declaration-property-value-no-unknown` is enabled, with an `ignoreProperties` entry applying `/^var\\(--.+\\)$/` to every property. This permits complete CSS custom-property references such as `var(--color-text)` while retaining unknown-value checks for other values. The exception does not cover fallback syntax such as `var(--color-text, black)`.

## Step 6 — CSS Modules overrides

A dedicated overrides block targets `**/*.module.css` files and enables `property-no-unknown` there. Combined with the camelCase selector rule, this gives CSS Modules the strictest checks while keeping global stylesheets (resets, theme bridge files) less rigid.

## Step 7 — Wiring patterns

Two consumer wiring patterns must be supported:

- Inline reference: `{ "stylelint": { "extends": "<package>/stylelint" } }` inside `package.json`.
- Standalone Stylelint config file extending the same subpath.

## Step 8 — Plugin packaging

`stylelint-config-standard` is an optional peer dependency of the preset package, next to `stylelint`. A consumer that runs Stylelint installs both, so repositories without CSS do not install Stylelint and its transitive glob dependencies. The peer metadata marks both as optional.

## Step 9 — Export entry

The exports map exposes the preset under `./stylelint` pointing at the JSON file. No `types` or `import` conditional is needed.

## Acceptance criteria

- The exported JSON extends `stylelint-config-standard` and contains the exact rule values and single CSS Module override described above.
- Representative selectors prove camelCase class/keyframe enforcement, unrestricted custom-property names, and accepted `:global` usage.
- A declaration value consisting of `var(--token)` is accepted, while an otherwise unknown value remains reportable.
- `**/*.module.css` enables `property-no-unknown`; a non-module stylesheet does not receive that override.
