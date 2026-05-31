# Spec 00 — Overview & Goals

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
