# Spec 20 — Reusable Package Workflows

## Step 1 — Purpose

Consumer packages in the `@jankrajewskiit` scope run the same verify and publish pipeline as this repository's Specs 11 and 12. Two reusable workflows in this repository let each consumer call that pipeline instead of copying it.

This repository's own `verify.yml`, `ci.yml`, and `publish.yml` stay as defined in Specs 11 and 12; it does not call the workflows below.

## Step 2 — `verify-package.yml`

Declares `on: workflow_call` with an optional `GHCR_TOKEN` secret and no inputs. It defines one job `verify` on `ubuntu-latest` with `contents: read` and `packages: read`.

Steps in order:

1. `actions/checkout@v7`.
2. `actions/setup-node@v7` with `node-version-file: .nvmrc`, `registry-url: https://npm.pkg.github.com`, `scope: '@jankrajewskiit'`, and `cache: npm`.
3. `npm ci`.
4. `npm audit --audit-level=high`, without `continue-on-error` (Spec 19).
5. `npm run verify`.

The job exports `GHCR_TOKEN` and `NODE_AUTH_TOKEN` from `secrets.GHCR_TOKEN`, falling back to `github.token`. The consumer `.npmrc` references `${GHCR_TOKEN}`, so every npm invocation in the job needs it defined.

## Step 3 — `publish-package.yml`

Declares `on: workflow_call` with an optional `GHCR_TOKEN` secret and runs two sequential jobs:

1. `check-version` (`contents: read`) rejects a tag that is not `v<semver>` or whose version differs from `package.json`, and outputs the version.
2. `publish` (`contents: read`, `packages: write`, `id-token: write`) installs with `npm ci` and runs `npm publish --provenance --access public`, adding `--tag <channel>` for a prerelease version. The channel is the text between the first `-` and the next `.`. The publish step authenticates with `github.token`.

Publishing runs the consumer's `prepublishOnly` script, so a consumer whose artifacts are built during `verify` produces them before upload.

## Step 4 — Consumer wiring

A consumer keeps three thin workflow files:

- `ci.yml` triggers on push and pull requests against `main` and has one job calling `verify-package.yml`.
- `publish.yml` triggers on `v*` tags, calls `verify-package.yml`, then calls `publish-package.yml` with `needs`.
- Every call forwards `secrets: { GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }} }` explicitly and, for `publish-package.yml`, grants the job-level `permissions` listed in Step 3.

Calls reference `jankrajewskiit/velvetconfigs/.github/workflows/<file>@main`. A consumer repository requires `.nvmrc`, an `engines.node` that matches it, an `npm run verify` script, and the `.npmrc` described in the README.

## Acceptance criteria

- A consumer `ci.yml` and `publish.yml` contain no copy of the install, audit, version-check, or publish step lists.
- The called workflows read the Node version from the consumer's `.nvmrc`.
- A tag that does not match the consumer's `package.json` version fails before registry write credentials are used.
- Only the `publish` job has `packages: write` and `id-token: write`.
