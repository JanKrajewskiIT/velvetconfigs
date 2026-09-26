# Spec 01 — Package Structure & Exports

## Step 1 — Repository skeleton

Create one folder per tool category at the repository root. Each folder owns one published artifact and is referenced individually from the package's exports map. No barrel file at the repository root; consumers always reach a tool's preset through its subpath.

Top-level folders to create:

- `eslint/` — ESLint flat-config factory (ESM module).
- `prettier/` — Prettier preset (JSON).
- `stylelint/` — Stylelint preset (JSON).
- `tsconfig/` — Multiple base TypeScript configs (JSON files).
- `vite/` — Vite config factories (ESM module + declaration file).
- `lint-staged/` — lint-staged factory (ESM module + declaration file).
- `husky/` — Husky pre-commit shell helper.
- `nginx/` — Nginx SPA configuration file.

Top-level files:

- `package.json` — package manifest with manifests, peer deps, and exports map.
- `README.md` — install instructions and usage table.
- `LICENSE` — MIT (or chosen license).
- `lint-staged.config.mjs` — the package's OWN lint-staged config (the package eats its own dog food for formatting only; see Spec 14).

## Step 2 — Package manifest baseline

The `package.json` MUST:

- Use the package name `@jankrajewskiit/configs`. The audited source version is `2.0.4`; version remains release metadata and changes only through Specs 12–13.
- Declare `"type": "module"` so every `.js` is treated as ESM. JavaScript artifacts are written as `.mjs` and type declarations as `.d.mts` to keep extensions explicit regardless of the consumer's resolution mode.
- Declare `"license": "MIT"` and `"repository": { "type": "git", "url": "git+https://github.com/jankrajewskiit/configs.git" }`.
- Declare `"publishConfig.registry": "https://npm.pkg.github.com"`.
- Declare `"publishConfig.access": "public"`. npm refuses to attach provenance attestations to a package published as `restricted` (or to a new private package). Because the publish pipeline (Spec 13) MUST always attach provenance, the access level MUST be `public`. On GitHub Packages, who can actually pull the package is still gated by the GitHub repo/org permissions, regardless of this flag.
- Declare `"engines.node": ">=26"`; verify and publish pin Node `26.x`.
- Declare its OWN Prettier reference by pointing `"prettier"` at the in-repo Prettier preset path. This guarantees the package is formatted with the same preset it publishes.

## Step 3 — Optional peer dependencies

Every tool runtime (ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged) is declared as a peer dependency with a permissive major-version range. Each peer is ALSO declared in `peerDependenciesMeta` with `"optional": true`.

Consequences of the optional-peer model:

- A consumer who never runs Stylelint installs no Stylelint binary just by depending on this package.
- npm does not warn or fail when an optional peer is missing.
- The preset's regular `dependencies`, including Stylelint's standard config and the Vite plugins, are installed unconditionally. Optional peers avoid installing the tool runtimes, not their preset-owned integrations.

`peerDependenciesMeta` MUST contain exactly the names declared in `peerDependencies`. The legacy manifest's orphan entries for `vite-plugin-dts` and `vite-plugin-solid` are invalid metadata and MUST NOT be reproduced; both packages remain regular dependencies.

## Step 4 — Dependencies (preset plugins)

Plugin packages used inside the ESLint factory and the Stylelint preset are declared as REGULAR `dependencies`, not peers. The rationale: their versions must stay locked to whatever the preset author has validated against. Consumers should never have to think about plugin compatibility.

The plugin set covers:

- ESLint core recommended config provider.
- typescript-eslint strict-type-checked profile.
- Solid plugin (TypeScript flat-config preset).
- jsx-a11y plugin.
- css-modules plugin.
- simple-import-sort plugin.
- unused-imports plugin.
- eslint-config-prettier (disables stylistic rules that conflict with Prettier).
- globals (predefined environment globals).
- Stylelint standard config.
- Vite Solid plugin and `vite-plugin-dts` (loaded lazily inside the Vite library factory).

The audited dependency ranges are part of the reproducible baseline:

| Package                            | Range      |
| ---------------------------------- | ---------- |
| `@eslint/js`                       | `^9.x`     |
| `eslint-config-prettier`           | `^10.1.8`  |
| `eslint-plugin-css-modules`        | `^2.12.0`  |
| `eslint-plugin-jsx-a11y`           | `^6.10.2`  |
| `eslint-plugin-simple-import-sort` | `^13.0.0`  |
| `eslint-plugin-solid`              | `^0.14.5`  |
| `eslint-plugin-unused-imports`     | `^4.4.1`   |
| `globals`                          | `^17.6.0`  |
| `stylelint-config-standard`        | `^40.0.0`  |
| `typescript-eslint`                | `^8.61.0`  |
| `vite-plugin-dts`                  | `^5.0.2`   |
| `vite-plugin-solid`                | `^2.11.12` |

Runtime peer ranges are `eslint >=9.0.0`, `lint-staged >=17.0.0`, `prettier >=3.0.0`, `stylelint >=17.0.0`, `typescript >=5.5.0`, and `vite >=6.0.0`.

## Step 5 — Dev dependencies

Strictly limited to:

- `prettier` — needed to run `prettier --check` in CI.
- `lint-staged` — used by the package's own pre-commit hook.
- `husky` — installs the package's own Git hooks.
- `publint` — validates the published artifact during the verify pipeline.

The audited dev ranges are `husky ^9.1.7`, `lint-staged ^17.0.7`, `prettier ^3.8.4`, and `publint ^0.3.21`. The committed lockfile is required for reproducible `npm ci`; a clean-room implementation may regenerate it from these direct ranges rather than copy legacy transitive structure.

## Step 6 — Exports map

The `exports` field exposes each artifact by subpath. Rules:

- One subpath per concern; no wildcard exports.
- JSON files are exported as plain string paths.
- JavaScript modules with type declarations use conditional exports with both `types` and `import` conditions pointing at the matching files.
- Shell scripts and configuration files (Husky hook, Nginx config) are exported by raw path so consumers can copy or source them.

Required subpaths:

- `./eslint` — ESLint factory module.
- `./prettier` — Prettier JSON preset.
- `./stylelint` — Stylelint JSON preset.
- `./tsconfig/app` — browser app baseline.
- `./tsconfig/node` — Node baseline.
- `./tsconfig/app-vite` — app baseline + Vite client types.
- `./tsconfig/node-vite` — Node baseline + Node types.
- `./tsconfig/lib` — library baseline emitting declarations.
- `./tsconfig/test` — app baseline + Vitest globals + Testing Library DOM types.
- `./vite` — Vite factories module (app + library).
- `./lint-staged` — lint-staged factory + default export.
- `./husky/pre-commit` — pre-commit shell snippet.
- `./nginx/spa` — Nginx SPA configuration.

## Step 7 — `files` field

The published tarball contains ONLY:

- The eight tool folders enumerated above.
- `README.md`.
- `LICENSE`.

Test fixtures, the package's own lint-staged config, the GitHub Actions directory, and node_modules are excluded by virtue of not being listed. This keeps the install footprint minimal and prevents the package from shipping its own repo-only tooling to consumers.

## Step 8 — Package metadata

- `"keywords"` enumerates each tool ecosystem the package supports (`eslint-config`, `prettier-config`, `stylelint-config`, `tsconfig`, `vite-config`, `solidjs`, `lint-staged`, `husky`, `nginx`). Keywords drive registry discoverability.
- `"description"` is a single sentence that names the supported tools and the target framework (SolidJS apps and libraries).
- The exact audited description is `Shared tooling presets (ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged, Husky, Nginx) for SolidJS apps and libraries.`
- `"scripts"` are limited to: format, format-check, verify, prepublishOnly (chained to verify), and prepare (installs Husky hooks). No build step is required because every artifact is hand-authored.

The script values are exactly `prettier --write .`, `prettier --check .`, `npm run format:check && publint`, `npm run verify`, and `husky`, respectively.

## Step 9 — Self-validation hooks

- `"prepublishOnly"` chains the verify script so a manual `npm publish` cannot accidentally ship an unformatted or invalid package.
- `"prepare"` runs Husky so anyone cloning the repository gets the project's pre-commit hook installed automatically.
- The publint dependency is invoked by the verify script to flag exports-map drift, missing files, or condition ordering errors before publish.

## Acceptance criteria

- Importing every JavaScript subpath and resolving every JSON/text subpath succeeds from a packed consumer installation.
- TypeScript resolves the declarations for `./eslint`, `./vite`, and `./lint-staged`; each conditional export lists `types` before `import`.
- The package tarball contains only the eight tool directories, `README.md`, and `LICENSE`, plus npm-generated package metadata.
- All six tool-runtime peers are optional, every preset/plugin dependency is regular, and no peer metadata exists for a non-peer.
- `npm run verify` is the sole package verification entrypoint and `prepublishOnly` invokes it.
