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

- Declare `"type": "module"` so every `.js` is treated as ESM. JavaScript artifacts are written as `.mjs` and type declarations as `.d.mts` to keep extensions explicit regardless of the consumer's resolution mode.
- Declare `"license"` and a stable `"repository.url"`.
- Declare `"publishConfig.registry"` pointing at the chosen registry (GitHub Packages or npm). Scoped packages on GitHub Packages require this entry to override the public registry default.
- Declare `"publishConfig.access": "public"`. npm refuses to attach provenance attestations to a package published as `restricted` (or to a new private package). Because the publish pipeline (Spec 13) MUST always attach provenance, the access level MUST be `public`. On GitHub Packages, who can actually pull the package is still gated by the GitHub repo/org permissions, regardless of this flag.
- Declare `"engines.node"` matching the lowest Node major the presets are tested against. The verify pipeline pins this Node version.
- Declare its OWN Prettier reference by pointing `"prettier"` at the in-repo Prettier preset path. This guarantees the package is formatted with the same preset it publishes.

## Step 3 — Optional peer dependencies

Every tool runtime (ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged) is declared as a peer dependency with a permissive major-version range. Each peer is ALSO declared in `peerDependenciesMeta` with `"optional": true`.

Consequences of the optional-peer model:

- A consumer who never runs Stylelint installs no Stylelint binary just by depending on this package.
- npm does not warn or fail when an optional peer is missing.
- The preset's `dependencies` (plugins) are still installed unconditionally; they are leaves in the dependency tree and tiny, so the cost is acceptable.

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

## Step 5 — Dev dependencies

Strictly limited to:

- `prettier` — needed to run `prettier --check` in CI.
- `lint-staged` — used by the package's own pre-commit hook.
- `husky` — installs the package's own Git hooks.
- `publint` — validates the published artifact during the verify pipeline.

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
- `"scripts"` are limited to: format, format-check, verify, prepublishOnly (chained to verify), and prepare (installs Husky hooks). No build step is required because every artifact is hand-authored.

## Step 9 — Self-validation hooks

- `"prepublishOnly"` chains the verify script so a manual `npm publish` cannot accidentally ship an unformatted or invalid package.
- `"prepare"` runs Husky so anyone cloning the repository gets the project's pre-commit hook installed automatically.
- The publint dependency is invoked by the verify script to flag exports-map drift, missing files, or condition ordering errors before publish.
