# Spec 00 — Overview & Goals

## Clean-room rebuild contract

These specifications define the observable and operational contract for a replacement implementation. After this specification set is approved, the rebuilding agent MUST use `specs/` as its sole implementation brief and MUST NOT inspect the legacy source, its diffs, or implementation-specific documentation unless the user explicitly reopens that source.

The replacement may use clearer code, different private helpers, and a different internal module layout. It MUST preserve the published package name, subpath exports, public types, configuration values, defaults, merge precedence, errors, generated command lines, workflow behavior, and shipped file contents described here. Private helper names and algorithms are not compatibility requirements.

Removing or archiving the legacy implementation is a separate operation and is not authorized by these specifications.

## Sources, provenance, and precedence

- `SOURCE` — behavior confirmed in the package manifest, exported artifacts, repository scripts, or GitHub workflow/configuration files at the time of this audit.
- `POLICY` — a repository or release requirement that may intentionally supersede older implementation behavior.
- `DECISION` — a product or maintainer choice that must remain visible even when no executable artifact can prove it.
- `ASSUMPTION` — unresolved input; it is not approved behavior until its resolution condition is met.

Each numbered step is a stable requirement group with identifier `CFG-<spec number>-<step number>`; letter suffixes may identify individual bullets when needed. Unless explicitly marked otherwise, Specs 01–12 describe `SOURCE` behavior. Specs 13, 15, 17, and 19 are `POLICY`; when they conflict with an earlier spec, the higher-numbered policy requirement takes precedence and the earlier spec must link to the override.

Authoritative executable sources are `package.json`, exported files under the eight package directories, root repository configuration, and `.github/`. README examples are supporting evidence only. A discrepancy between prose and executable evidence must be recorded as either a correction to the spec or an explicit legacy defect; it must not be silently copied into the replacement.

Known legacy defects that MUST NOT be reproduced:

- `package.json` contains orphaned `peerDependenciesMeta` entries for `vite-plugin-dts` and `vite-plugin-solid`, although both are regular dependencies rather than peers. The replacement keeps them only in `dependencies` and omits their peer metadata.
- The legacy README suggests extending the Prettier JSON preset from `.prettierrc.json`, which Prettier does not support; Spec 03 defines the valid JavaScript/ESM layering form.
- The legacy README omits provenance verification and explicit previous-major upgrade guidance required by Spec 13. The rebuilt README must satisfy the specification rather than reproduce those omissions.
- The legacy Nginx asset location adds its own `Cache-Control` header without repeating server-level security headers. Under Nginx `add_header` inheritance, those asset responses lose the security headers. The replacement must satisfy Spec 10 for every response class and must not preserve this defect.

No unresolved assumptions currently block the rebuild. Registry ownership, repository settings, secrets, and release history remain environment-owned inputs and are called out in their owning specs.

## Purpose

Deliver a single npm package that ships shared tooling presets for SolidJS applications and libraries. The package centralizes formatting, linting, type-checking, bundling, pre-commit hygiene, and runtime web-server configuration so that every consumer repository can adopt the same baseline by installing one dependency and pointing each tool at a subpath export.

## Target consumers

- SolidJS browser applications (SPA) built with Vite.
- SolidJS component libraries built with Vite and shipped as ESM-only packages.
- Node-side projects (CLI utilities, scripts, build helpers, server code) that share the same TypeScript/Prettier baseline but do not need Solid- or DOM-specific lint rules.

## Non-goals

- The package does NOT contain runtime UI code, components, hooks, or design tokens.
- It does NOT pin SolidJS, the router, or any UI library version — those remain peer concerns of consumers.
- It does NOT ship custom ESLint rules; only opinionated configurations of existing community rules plus a few selector builders for project-level constraints.
- It does NOT include test runners (Vitest, Playwright, etc.) — it only provides the TypeScript profile required for testing environments.

## Guiding principles

- **Single source of tooling truth.** Every consumer repository pulls the same preset version; bumping the package bumps every consumer's tooling consistently.
- **Subpath exports over deep imports.** Each tool consumes exactly the artifact it expects (JSON, mjs, shell script, conf file), without forcing barrel files or re-bundling.
- **Factory functions over static objects** where dynamic context is required (project root, environments, externals). Static JSON is used only where every consumer needs the same literal payload (Prettier, Stylelint, base tsconfigs).
- **Optional peers.** Each tool dependency is declared as an optional peer. Consumers install only the tools they actually run, and the package itself does not pull tools into consumer node_modules unless needed.
- **ESM-only.** The package is `type: module`; every JavaScript artifact is `.mjs`; type declarations are `.d.mts`.
- **No transitive surprises.** Plugin versions are pinned by the preset's `dependencies`. Tool runtimes (ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged) live as peers so the consumer chooses the major.

## Tooling surface covered

| Concern               | Technology                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| Linting (browser/JSX) | ESLint flat config + `typescript-eslint` strict-type-checked + Solid plugin |
| Linting (Node)        | Same baseline, minus Solid/a11y/css-modules plugins                         |
| Formatting            | Prettier                                                                    |
| Style linting         | Stylelint with `stylelint-config-standard` + CSS Modules overrides          |
| TypeScript            | Multiple base tsconfigs (app, node, +Vite client, +Node types, lib, test)   |
| Bundling (app)        | Vite + `vite-plugin-solid`                                                  |
| Bundling (library)    | Vite + `vite-plugin-solid` + `vite-plugin-dts`                              |
| Staged-file gating    | `lint-staged`                                                               |
| Git hooks             | Husky pre-commit script                                                     |
| Runtime web server    | Nginx config for SPA hosting                                                |
| Release automation    | GitHub Actions (verify + publish on tag) targeting GitHub Packages          |

## How to read these specs

Specs are numbered in implementation order. Earlier specs define structure and presets; later specs define pipelines and release flow. Each spec is self-contained but cross-references neighbors when behavior overlaps (for example, the Vite library spec relies on the TypeScript library tsconfig spec).

## Task index and dependency order

| Spec | Primary outcome                                         | Depends on     | Minimum acceptance evidence                                                                                                                             |
| ---- | ------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01   | Publishable package manifest and subpath surface        | 00             | Packed manifest exposes every required path and contains only allowlisted files.                                                                        |
| 02   | Browser and Node ESLint factories                       | 01             | Imports resolve; factory output has the specified layer order, defaults, rules, overrides, and failure cases.                                           |
| 03   | Prettier preset                                         | 01             | Exported JSON resolves and contains exactly the five specified keys and values.                                                                         |
| 04   | Stylelint preset                                        | 01             | Exported JSON resolves; representative global and CSS Module files produce the specified rule outcomes.                                                 |
| 05   | TypeScript base configurations                          | 01             | Each exported config resolves and an appropriate minimal consumer type-checks with its stated ambient types and emit behavior.                          |
| 06   | Solid application Vite factory                          | 01             | A minimal app config demonstrates defaults, proxy behavior, linked-workspace behavior, merge precedence, and validation errors.                         |
| 07   | Solid library Vite factory                              | 05, 06         | A minimal library config demonstrates ESM output shape, externals, declaration behavior, merge precedence, and validation errors.                       |
| 08   | lint-staged factory                                     | 01             | Default and customized calls return the exact glob-to-command mappings.                                                                                 |
| 09   | Reusable Husky hook                                     | 08             | Shell scenarios cover PATH Node, fnm recovery, local fallback, missing tools, exit propagation, CWD, and flags.                                         |
| 10   | Nginx SPA server block                                  | 01             | Configuration parses and HTTP checks cover deep-route fallback, index caching, asset caching, headers, and port.                                        |
| 11   | Reusable verification workflow                          | 01, 14, 19     | Workflow syntax is valid and a run executes clean install, hard-gated audit, formatting check, and publint on the pinned Node matrix.                   |
| 12   | Tag-driven publish workflow                             | 11, 13         | Stable and prerelease dry runs demonstrate version gating, least privilege, provenance, and correct npm dist-tags.                                      |
| 13   | Versioning, release, and provenance policy              | 01, 12         | Release documentation and workflow behavior agree for stable, prerelease, deprecation, and failure paths.                                               |
| 14   | Repository self-hosting and agent-guidance installation | 01, 03, 08, 09 | Repository scripts use shipped presets where applicable, and the guidance installer reproduces generated client views from the single `.agents` source. |
| 15   | Dependency automation                                   | 11, 13         | Dependabot configuration validates with both ecosystems, grouping, labels, limits, and reviewer policy.                                                 |
| 17   | Editor and Node version pinning                         | 11             | Editor, Git, local runtime, verify, and publish pins agree.                                                                                             |
| 19   | Audit gate, ownership, and refresh runbook              | 11, 13, 15, 17 | High-severity audit findings fail verification; ownership paths resolve; the refresh procedure is reviewable and reproducible.                          |

The numbering intentionally retains historical gaps; there are no Specs 16 or 18.

## Shared acceptance rules

- Acceptance evaluates public imports, returned configuration values, generated commands, process exit behavior, HTTP behavior, package contents, and workflow behavior. It does not compare private source structure.
- Every required default and error path must be exercised at least once. Examples in a spec illustrate contracts but do not replace acceptance evidence.
- Public `.d.mts` declarations must match runtime exports and option defaults without exposing accidental private helpers.
- Static JSON and text artifacts may be compared structurally or byte-for-byte where their literal content is the contract.
- Repository-only files must remain outside the package tarball; every exported artifact must be inside it.
- Validation commands are selected by the implementer according to the replacement repository's toolchain. The required outcome is the evidence above, not reuse of legacy tests or scripts.

## Handoff completion

The specification set is ready to freeze only when all `ASSUMPTION` items are resolved, contradictions are removed, every public surface appears in the task index, and each task's acceptance evidence can be collected without reading the legacy implementation. The approved commit or archive containing `specs/` becomes the versioned handoff artifact.
