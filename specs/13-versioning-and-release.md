# Spec 13 — Versioning & Release Flow

## Step 1 — Semver contract

The package follows strict semver. Every published version is `MAJOR.MINOR.PATCH`:

- PATCH — bug fixes, dependency bumps that do not alter exported behavior, internal refactors invisible to consumers.
- MINOR — additive changes: new exports, new factory options with safe defaults, new rules enabled at a non-error severity, new tsconfig targets.
- MAJOR — breaking changes: removing or renaming an export, tightening lint rule severity to `error`, raising peer-dependency minimum versions, changing default behavior of an existing factory option.

## Step 2 — Breaking-change inventory

Treat the following as breaking and reserve them for MAJOR releases:

- Removing or renaming any subpath export.
- Raising the minimum peer-dependency version (e.g. ESLint 9 → 10).
- Raising the `engines.node` minimum.
- Changing the default value of any factory option (`apiProxy.path`, `preserveModulesRoot`, `formats`, etc.).
- Promoting an existing rule from `warn` to `error`, or adding a new rule at `error` severity.
- Changing the layer order in the ESLint flat-config output in a way that overrides consumer rules differently.
- Replacing a plugin in the ESLint or Stylelint preset with a different package (consumers may have downstream overrides keyed on the old plugin name).

Conversely, the following are NOT breaking:

- Adding a new subpath export.
- Adding a new factory option with a safe default.
- Adding a new tsconfig target.
- Tightening internal types in the type-declaration file when the runtime behavior is unchanged.
- Bumping a `dependencies` plugin within a patch-compatible range, provided no rule defaults change.

## Step 3 — Deprecation policy

Before removing an exported symbol or subpath:

- Keep the symbol functional for at least one minor cycle after deprecation.
- Mark it deprecated in the TypeScript declarations via `@deprecated` JSDoc on the symbol.
- Document the replacement in the README and link from the deprecation tag.
- Migrate the package's own internal usage to the replacement immediately so the deprecated path is not exercised by the verify pipeline.

Removal happens only in a MAJOR release that lists the deprecation cycle in the release notes.

## Step 4 — Changelog discipline

- Every released version has a corresponding entry in the release notes (GitHub Releases or a `CHANGELOG.md`, depending on the chosen workflow).
- Entries enumerate breaking changes, new exports, new options, and notable internal changes in that order.
- Migration notes appear inline with breaking entries; consumers must not need to read the diff to upgrade.

## Step 5 — Conventional commits

Use Conventional Commits prefixes in commit messages:

- `feat:` — MINOR-level addition.
- `fix:` — PATCH-level fix.
- `refactor:` — typically PATCH-level when behavior is unchanged.
- `docs:` — README or comment updates; no version bump required if no shipping artifact changed.
- `chore:` — repository tooling; typically no version bump.
- A `!` suffix or `BREAKING CHANGE:` footer marks the commit as MAJOR.

Conventional commits feed any future automation (e.g. release-please, semantic-release) but ARE NOT a strict requirement of the publish workflow; the workflow is driven by manual tags. The commit prefixes give release authors a quick way to scan history when choosing a bump.

## Step 6 — Version-bump workflow

The release author MUST:

1. Confirm `main` is on the desired commit and the verify workflow is green.
2. Run `npm version patch | minor | major`. This creates a commit that bumps the manifest version and a Git tag `vX.Y.Z` pointing at the new commit.
3. Push the commit AND the tag (`git push && git push --tags`, or `git push --follow-tags`).
4. The publish workflow takes over (Spec 12).

There is no separate release branch. Tags live on `main` so the release history is the main branch history.

## Step 7 — Pre-release flow

For release candidates or beta channels:

- Run `npm version prerelease --preid <channel>` to produce `vX.Y.Z-<channel>.<n>` tags.
- Publish workflow MUST inspect the version (or the tag) and pass `--tag <channel>` to `npm publish` so pre-releases never claim the `latest` dist-tag.
- Pre-release tags are immutable like any other tag; mistakes are corrected by bumping the iterator.

## Step 8 — Yanking / unpublishing

Both target registries (GitHub Packages and npmjs) treat unpublishing as a strongly discouraged operation. The release policy is:

- Never unpublish a version that has been live for more than a few minutes.
- For broken releases, publish a new patch that supersedes the broken one and document the issue in the release notes.
- Use registry-level deprecation (`npm deprecate`) to warn consumers off a known-broken version.

## Step 9 — Public-API boundary

Anything reachable from a subpath export is part of the public API and bound by these rules. Anything else (internal helpers, file layout, the structure of the GitHub Actions workflows) is internal and may change in any release without notice.

## Step 10 — Consumer upgrade guidance

The README MUST publish an "Upgrading" section that links to the current major-version release notes. When a new major ships, the README also documents the previous major's last-supported version so consumers can pin until they migrate.
