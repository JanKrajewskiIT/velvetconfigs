# Spec 03 — Prettier Preset

## Step 1 — Format

The Prettier preset is a single JSON file at `prettier/index.json`. JSON keeps the artifact consumable by Prettier's `"prettier"` field in `package.json` (which does not load JavaScript modules) and avoids any ESM/CJS interop concerns.

## Step 2 — Settings

The preset MUST contain exactly the following keys:

- `endOfLine: "lf"` — forces Unix line endings to keep diffs stable across platforms and Git autocrlf settings.
- `printWidth: 120` — wider than the Prettier default to reduce line-wrap noise in dense Solid JSX and TypeScript signatures.
- `semi: true` — semicolons enabled.
- `singleQuote: true` — single quotes preferred in JavaScript and TypeScript.
- `trailingComma: "all"` — trailing commas wherever syntactically valid, including function parameters.

No other keys are set. Consumers needing project-specific overrides (e.g. plugin order, Tailwind class sorting) layer their own Prettier config that `extends` this preset.

## Step 3 — Wiring patterns

Two consumer wiring patterns must be supported:

- Inline reference: `"prettier": "<package>/prettier"` inside `package.json`. This is the recommended pattern for projects that need no overrides.
- Local override file (`.prettierrc.js` / `.prettierrc.json`): the consumer imports/extends the preset and adds overrides. The preset shape is plain JSON, so it can be spread directly when the consumer authors their own config file.

## Step 4 — Package self-reference

The package itself wires `"prettier": "./prettier/index.json"` in its own `package.json`. The format and format-check scripts therefore exercise the published preset against the package's own source. Any change that breaks Prettier output is caught by the verify pipeline immediately.

## Step 5 — Export entry

The exports map exposes the preset under the `./prettier` subpath pointing at the JSON file. No `types` or `import` conditional is needed because Prettier only consumes the path string.
