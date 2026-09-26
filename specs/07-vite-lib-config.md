# Spec 07 — Vite Library Config Factory

## Step 1 — Module shape

Add `createSolidLibViteConfig` to the same `vite/index.mjs` module that hosts the app factory. The library factory is ASYNC because it loads `vite-plugin-dts` dynamically at first call. Dynamic loading keeps the dts plugin out of the app factory's startup path and out of consumer bundles that do not need declaration emission.

## Step 2 — Required behaviors

The factory MUST:

- Register `vite-plugin-solid` with any consumer-supplied plugin options.
- Register `vite-plugin-dts` with `insertTypesEntry: true` by default, unless the consumer disables declaration emission by passing `dts: false`.
- Configure a path alias mapping a token (default `~`) to the source directory.
- Configure Vite's library mode (`build.lib`) with the entry, file name, and output formats.
- Provide an externals matcher that excludes everything inside `node_modules` and, optionally, an explicit list of package names.
- Preserve the module graph in the output by default (`preserveModules: true`, `preserveModulesRoot: 'src'`).
- Disable CSS code splitting by default so libraries emit a single CSS bundle that consumers can import once.
- Target `esnext` by default.

## Step 3 — Options bag (defaults)

- `projectRoot` — root used to resolve `entry`, `srcDir`, and the package manifest. Default `process.cwd()`.
- `alias` — default `'~'`; `null` disables aliasing.
- `srcDir` — default `'src'`.
- `entry` — default `'src/index.ts'`.
- `fileName` — REQUIRED. The factory MUST throw with a descriptive error when this is missing. `fileName` is the base name used by Vite's library output; without it Vite cannot resolve output filenames.
- `formats` — default `['es']`. Library output is ESM-only by policy; consumers wanting CommonJS extend this.
- `externalPackages` — explicit array of package names treated as external. Default `[]`.
- `externalizeFromPackageJson` — boolean, default `false`. When true, the factory reads the package's `peerDependencies` and `dependencies` and unions them with `externalPackages`. This is the recommended pattern; the explicit array remains as an escape hatch.
- `preserveModules` — default `true`.
- `preserveModulesRoot` — default `'src'`.
- `cssCodeSplit` — default `false`.
- `target` — default `'esnext'`.
- `dts` — default is enabled with `{ insertTypesEntry: true }`. Pass `false` to disable the plugin entirely; otherwise an options object is spread after the default and may override `insertTypesEntry`.
- `solidPluginOptions` — verbatim to the Solid plugin.

## Step 4 — Externals matcher

External resolution is performed by a function returned to `rollupOptions.external`. The function:

- Returns true whenever the import id contains `node_modules` (catches any package import including subpaths and aliased lookups).
- Returns true whenever the import id matches one of the configured external package names — exact match or any subpath under it. The matcher uses a single anchored regex built from the escaped package names.
- Returns false otherwise.

Rationale: a plain `external: [...names]` does not match deep imports (`packageA/sub`); regex matching does, while still excluding the consumer's own source.

## Step 5 — Output filename strategy

`rollupOptions.output.entryFileNames` is a function that derives the output path by stripping the `preserveModulesRoot` prefix from each chunk name and appending `.js`. With `preserveModules: true`, this maps `src/components/Button/Button.tsx` to `components/Button/Button.js` in the output, mirroring the source tree.

## Step 6 — Helper: `readPeerDependencies`

Export a small helper `readPeerDependencies(packageJsonPath?)` that:

- Defaults the path to the CWD `package.json`.
- Reads and parses the manifest.
- Returns the union of `peerDependencies` and `dependencies` keys.
- Returns an empty array on any error (missing file, parse failure) instead of throwing — the lib factory falls back to explicit externals in that case.

This is the building block behind `externalizeFromPackageJson`. Exporting it lets advanced consumers compose externals lists.

## Step 7 — DTS plugin loading

The dts plugin is loaded inside a helper `loadDtsPlugin` that:

- Returns null when `dts: false` was passed.
- Dynamically `await import('vite-plugin-dts')`, resolves the `.default` export when present (handles both ESM and CJS interop shapes).
- Invokes the plugin with `insertTypesEntry: true` merged with any consumer-supplied options.

Because the helper is async, the entire factory is async; consumers must wrap the call in an async thunk inside `defineConfig`.

## Step 8 — Merge order

1. Resolve externals (union of `externalPackages` and, optionally, peer/runtime deps from the package manifest).
2. Build the base config with plugins, alias, build.lib, build.target, build.cssCodeSplit, and rollupOptions.
3. Merge user config last via `mergeConfig` so the consumer can override any decision.
4. Deduplicate `optimizeDeps.include`, `optimizeDeps.exclude`, and `resolve.dedupe` after merging, preserving first-occurrence order.

## Step 9 — Type declarations

`vite/index.d.mts` MUST also export:

- `CreateSolidLibViteConfigOptions` interface covering every option in Step 3.
- The async `createSolidLibViteConfig` signature returning `Promise<UserConfig>`.
- The `readPeerDependencies` helper signature.

## Step 10 — Consumer wiring

A library `vite.config.ts` calls the factory inside an async config callback, for example `defineConfig(async () => createSolidLibViteConfig(...))`. The consumer must await or return the factory promise through a Vite-supported async config shape.

## Step 11 — Pairing with TypeScript

- If `dts: false` is used, the consumer MUST emit declarations through `tsc -b` and extend `tsconfig/lib`. See Spec 05, Step 5.
- Otherwise, the consumer MUST extend `tsconfig/app` and set `declaration: false` so the two emitters do not collide.

## Acceptance criteria

- Omitting `fileName` rejects the async call with a descriptive error; all other omitted options resolve to the defaults above.
- The default output is ESM-only, preserves modules under `src`, targets `esnext`, emits one CSS bundle, and enables declaration generation with `insertTypesEntry: true`.
- Explicit package names and their subpaths are external, every id containing `node_modules` is external, and unrelated source ids are not.
- Manifest externalization returns the deduplicated union of dependency and peer names and degrades to an empty list for missing or invalid JSON.
- User config is merged last and post-merge dependency arrays are deduplicated.
- Runtime exports and `.d.mts` declarations expose both factories and `readPeerDependencies` through the single `./vite` subpath.
