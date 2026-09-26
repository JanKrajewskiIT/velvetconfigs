# Spec 05 — TypeScript Configurations

## Step 1 — Layout

All TypeScript base configs live under `tsconfig/` as JSON files. Each consumer-facing target is a separate file so it can be referenced via its own subpath export. Configs compose via the `extends` field so shared settings stay in one place.

Files to create:

- `tsconfig/app.json` — browser baseline.
- `tsconfig/node.json` — Node baseline.
- `tsconfig/app-vite.json` — browser baseline + `vite/client` ambient types.
- `tsconfig/node-vite.json` — Node baseline + Node ambient types.
- `tsconfig/lib.json` — browser baseline + declaration emit.
- `tsconfig/test.json` — browser baseline + Vitest globals + Testing Library DOM types, with unused-locals/parameters loosened.

## Step 2 — `app.json` (browser baseline)

Foundational compiler options:

- `target: "ES2024"` and `lib: ["ES2024", "DOM", "DOM.Iterable"]` — modern syntax, DOM types, async iterable types.
- `module: "ESNext"` with `moduleResolution: "bundler"` — Vite handles module resolution; the compiler is in type-check-only mode.
- `allowImportingTsExtensions: true` — Solid components frequently import sibling `.tsx` files; bundlers resolve them transparently.
- `verbatimModuleSyntax: true` — forces `import type` for type-only imports, preventing accidental runtime imports of types.
- `isolatedModules: true` — guarantees each file is independently transpilable, required by Vite.
- `moduleDetection: "force"` — every file is treated as a module even without imports/exports.
- `noEmit: true` — type checking only; bundler emits JavaScript.
- `jsx: "preserve"` with `jsxImportSource: "solid-js"` — preserves JSX for the Solid plugin to compile.

Strictness profile:

- `strict: true`.
- `noUnusedLocals: false` — left to ESLint (unused-imports plugin) so warnings can be incremental.
- `noUnusedParameters: true`.
- `erasableSyntaxOnly: true` — prevents non-erasable TS features (enum, parameter properties, namespaces with value semantics) that interact poorly with `verbatimModuleSyntax` and bundler transforms.
- `noFallthroughCasesInSwitch: true`.
- `noUncheckedSideEffectImports: true`.
- `noUncheckedIndexedAccess: true` — indexed access yields `T | undefined` to model real runtime behavior.
- `skipLibCheck: true` — skip type-checking of third-party `.d.ts` for performance.

## Step 3 — `node.json` (Node baseline)

Same strictness profile as `app.json` with these adjustments:

- `lib: ["ES2024"]` — no DOM.
- No `jsx` / `jsxImportSource` keys.
- `noUnusedLocals: true` — enabled because Node code is typically smaller and less in-flight than UI features.

## Step 4 — `app-vite.json` and `node-vite.json`

Each is a one-line extension over its base:

- `app-vite.json` extends `app.json` and adds `types: ["vite/client"]` so `import.meta.env`, `import.meta.glob`, and asset modules are typed correctly in app code.
- `node-vite.json` extends `node.json` and adds `types: ["node"]` so Node built-ins are available in tooling scripts.

The suffix identifies common Vite-repository roles, not one shared ambient-type set: `app-vite` adds Vite client globals, while `node-vite` adds Node globals for Vite configuration and build helpers. A Node-side project that also needs `vite/client` must add it explicitly alongside `node`.

## Step 5 — `lib.json` (library declaration emit)

Extends `app.json` and overrides for declaration emit:

- `noEmit: false`.
- `emitDeclarationOnly: true`.
- `declaration: true`.
- `declarationMap: true`.
- `outDir: "dist"`.
- `types: ["vite/client"]` — needed when the library source references `import.meta.env`.

Usage rule: `lib.json` is for libraries where `tsc -b` emits the `.d.ts` files (typical when no `vite-plugin-dts` is used). Libraries that delegate declaration emission to `vite-plugin-dts` should instead use `app.json` with `declaration: false` so the two emitters do not race.

## Step 6 — `test.json` (test profile)

Extends `app.json` and adds:

- `types: ["vite/client", "vitest/globals", "@testing-library/jest-dom"]` — globals for the Vitest runtime and DOM matcher augmentations.
- `noUnusedLocals: false` and `noUnusedParameters: false` — test files frequently introduce locals as setup or `beforeEach` capture; unused-locals strictness creates noise.

## Step 7 — Wiring in consumer repositories

Consumers extend the appropriate base in their own `tsconfig.json`:

- A SolidJS app: extend `app-vite`.
- A library that emits its own declarations via `tsc`: extend `lib`.
- A library that delegates declarations to `vite-plugin-dts`: extend `app` with `declaration: false`.
- A Node CLI/script: extend `node` (or `node-vite` when shipped via a Vite-driven build).
- A test-only override file (`tsconfig.test.json`): extend `test`.

Composite project layouts (`tsconfig.json` + `tsconfig.node.json` + `tsconfig.test.json` referenced via `references`) compose freely on top of these bases.

The package exports configuration only. Consumers are responsible for installing every ambient type provider named by their selected config: Vite for `vite/client`, `@types/node` for `node`, Vitest for `vitest/globals`, and `@testing-library/jest-dom` for its matcher augmentation. Those providers are not added as peers solely because a tsconfig references them.

## Step 8 — Export entries

The exports map exposes each tsconfig file under `./tsconfig/<name>` mapping directly to the JSON path. TypeScript resolves the path as-is; no conditional exports are required.

## Acceptance criteria

- All six exported JSON files parse, resolve their relative `extends`, and contain the exact compiler options described above.
- A minimal browser, Node, library, and test consumer observes the stated JSX, DOM, ambient type, strictness, and declaration-emit behavior.
- `app-vite` exposes Vite client types but not Node globals; `node-vite` exposes Node globals but does not implicitly add Vite client types.
- `lib` emits declarations and declaration maps only to `dist`; all other bases retain their stated no-emit behavior.
- Missing consumer-owned ambient type packages fail resolution rather than being silently supplied by this package.
