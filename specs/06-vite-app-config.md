# Spec 06 — Vite Application Config Factory

## Step 1 — Module shape

Create `vite/index.mjs` exporting a factory `createSolidAppViteConfig`. Co-locate a hand-authored type declaration in `vite/index.d.mts` so consumers using TypeScript see correct option types without forcing the package through a build step.

The factory:

- Accepts an optional user Vite config object and an options bag.
- Returns a fully resolved Vite `UserConfig` object suitable for direct return from `defineConfig`.
- Is synchronous (the library factory is async because of dynamic plugin loading; the app factory has no such dependency).

## Step 2 — Required behaviors

The factory MUST:

- Register `vite-plugin-solid` with any consumer-supplied plugin options.
- Configure a path alias mapping a token (default `~`) to the source directory (default `src`). Passing `alias: null` disables the alias entirely.
- Compose its base config with the optional user config via Vite's `mergeConfig` helper so consumer overrides are deep-merged correctly.
- Deduplicate `optimizeDeps.include`, `optimizeDeps.exclude`, and `resolve.dedupe` arrays after the merge so repeated entries from layered configs do not bloat the final config.

## Step 3 — Options bag (default values)

- `projectRoot` — root used to resolve `srcDir` and linked-workspace paths. Default `process.cwd()`.
- `alias` — alias token. Default `'~'`. Pass `null` to skip aliasing.
- `srcDir` — source directory the alias targets. Default `'src'`.
- `port` — dev server port. When provided, `server.port` AND `preview.port` are set to the same value so dev and preview environments agree.
- `host` — dev server host (string or boolean). When provided, set on `server.host`.
- `solidPluginOptions` — passed verbatim to the Solid plugin.
- `apiProxy` — see Step 4.
- `linkedWorkspace` — see Step 5.

## Step 4 — API proxy option

The factory accepts an `apiProxy` option that wires Vite's dev-server proxy to a backend API during local development. The option must support:

- `enabled` flag; when false or absent, no proxy is wired.
- `env` — typically the result of `loadEnv` from Vite — used to look up the target URL.
- `envVar` — environment variable name read from `env`. Default `'VITE_API_BASE_URL'`.
- `target` — explicit override, takes precedence over `env`.
- `fallbackTarget` — used when neither `target` nor the env value is present.
- A final fallback of `http://localhost:5000` so a freshly cloned project still starts.
- `path` — the proxy path prefix. Default `'/api'`.
- `changeOrigin` — default `true`.
- `secure` — default `false`.
- `rewrite` — either a custom `(path: string) => string` function, or `false` to disable rewriting, or unset to use a default rewrite that strips the escaped proxy path prefix from the start of the forwarded request. For the default path, `/api/users` becomes `/users`.

The factory composes these inputs into Vite's `server.proxy[path]` shape.

## Step 5 — Linked-workspace option

A second optional behavior supports developing a sibling workspace package (e.g. a UI library) against the app without publishing. The `linkedWorkspace` option must support:

- `enabled` flag.
- `workspacePath` (required when enabled) — absolute or relative path to the sibling workspace root.
- `packageName` (required when enabled) — the sibling package's name (e.g. `@scope/ui`).
- `fileAliases` — array of strings or `{ from, local? }` objects. `find` resolves to `<workspacePath>/node_modules/<from>`. A string or omitted `local` resolves `replacement` to `<projectRoot>/node_modules/<from>`; an explicit `local` is used verbatim as the replacement.
- `dedupe` — array fed into `resolve.dedupe`; default `[]`.
- `optimizeDepsInclude` and `optimizeDepsExclude` — defaults: include is empty; exclude defaults to the sibling package name to keep Vite from prebundling the linked source.

The factory also extends `server.fs.allow` with both the project root and the workspace path so Vite serves files outside the project root.

The factory MUST throw with a descriptive error when `enabled` is true and either `workspacePath` or `packageName` is missing — silent fallthrough produces confusing resolution errors later.

## Step 6 — Merge order

Internal merge order (most-specific wins):

1. Base config built from the options bag (plugins, alias, server, preview).
2. Linked-workspace overlay merged in via `mergeConfig`.
3. User-supplied config merged in last via `mergeConfig` so consumer values override library decisions.
4. Post-merge dedup pass over `optimizeDeps` and `resolve.dedupe`.

## Step 7 — Type declarations

`vite/index.d.mts` MUST export:

- `ApiProxyOptions`, `LinkedWorkspaceOptions`, `LinkedWorkspaceFileAlias`, and `CreateSolidAppViteConfigOptions` interfaces.
- The `createSolidAppViteConfig` function signature with both arguments typed and the return typed as Vite's `UserConfig`.

Type-only re-exports from `vite-plugin-solid` (the Solid plugin's options) and `vite` (`UserConfig`, `LibraryFormats`, `BuildOptions`) are imported via `import type` so the declarations remain peer-only.

## Step 8 — Export entry

The exports map exposes `./vite` as a conditional export with `types` pointing at `vite/index.d.mts` and `import` pointing at `vite/index.mjs`. The library factory shares the same subpath; see Spec 07.

The single module also exports the library factory and its public `readPeerDependencies` helper defined in Spec 07. These are one public module surface, not separate app/lib subpaths.

## Step 9 — Consumer wiring

A consumer's `vite.config.ts` returns the factory result inside `defineConfig`, optionally inside an `({ mode }) => ...` thunk so `loadEnv` can be called for the `apiProxy.env` field. The factory itself is environment-agnostic and does not call `loadEnv` internally.

## Acceptance criteria

- With no options, the result has one Solid plugin and resolves `~` to `<cwd>/src`; `alias: null` removes the preset alias.
- Port, host, proxy target precedence, proxy rewrite modes, and linked-workspace defaults produce the exact Vite fields described above.
- Enabling a linked workspace without either required field throws before returning a config.
- User config is merged last, then duplicate entries are removed from `optimizeDeps.include`, `optimizeDeps.exclude`, and `resolve.dedupe` while first-occurrence order is preserved.
- Runtime exports and `.d.mts` declarations expose the same option and return contracts.
