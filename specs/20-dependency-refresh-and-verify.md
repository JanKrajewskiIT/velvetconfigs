# Spec 20 — Dependency Refresh and Final Verification

## Step 1 — Principle

Specs 15 (Dependabot) and 19 (audit gating) keep the dependency graph fresh incrementally. They do not replace the periodic full refresh: a single deliberate pass that bumps every dependency to its latest version, regenerates the lockfile, fixes any resulting transitive conflicts via the `overrides` field, and re-runs the entire verify pipeline. This pass MUST be the last step when applying Specs 15–19 from scratch, and SHOULD be re-run on a quarterly cadence regardless of Dependabot activity.

The refresh exists because Dependabot updates are conservative (within range) and grouped; a manual pass crosses range boundaries deliberately, surfaces majors that Dependabot would otherwise leave pinned, and consolidates the resulting churn into a single audit-able commit.

## Step 2 — Tooling

The refresh uses `npm-check-updates` invoked via `npx` so it is not added as a devDependency:

```bash
npx npm-check-updates@latest -u
```

`-u` rewrites every range in `package.json` (across `dependencies`, `devDependencies`, AND `peerDependencies`) to the latest available version. The refresh is unconditional: no `--target`, no `--dep` filter, no exclusion list. Partial refreshes hide drift; the only acceptable state after a refresh is "every dependency at latest".

`npm-check-updates` MUST NOT be added to `devDependencies`. The refresh is a maintainer-side operation; baking the tool into the package's dependency graph would create a self-referential loop on its own upgrades.

## Step 3 — Lockfile regeneration

After `npm-check-updates` rewrites `package.json`, the lockfile MUST be regenerated from scratch:

```bash
rm -rf node_modules package-lock.json
npm install
```

The `rm -rf` is intentional. `npm install` against an existing lockfile honours pinned transitive versions and partially defeats the refresh. A clean install resolves the entire graph from scratch against the new ranges.

`npm ci` is NOT used here. `npm ci` requires a lockfile that already matches `package.json`; the whole point of the refresh is that they don't yet match.

## Step 4 — Fixing transitive conflicts with `overrides`

`npm install` may fail or warn after a full bump for two recurring reasons:

- A transitive dependency requires a peer that is no longer compatible with the just-bumped direct dependency.
- Two direct dependencies pull in incompatible versions of a common transitive (the classic `ERESOLVE` error).

The fix mechanism is the `overrides` field in `package.json`, NOT a partial rollback of the refresh. `overrides` forces the entire graph to resolve a named package at a specific version regardless of what each consumer requests:

```json
{
  "overrides": {
    "<package>": "<version>",
    "<package>": {
      "<nested-package>": "<version>"
    }
  }
}
```

Use the narrowest override that resolves the conflict:

- Prefer flat overrides (`"foo": "^1.2.3"`) for transitive conflicts that affect the whole tree.
- Prefer nested overrides (`"foo": { "bar": "^2.0.0" }`) when only one branch of the tree needs the pin.
- Avoid catch-all overrides that silence warnings rather than resolve them.

Every override MUST carry an entry in the PR description naming:

- Which packages introduced the conflict.
- Why the override is the correct shape (flat vs nested).
- The condition under which the override can be removed (typically "when `<package>` releases a version compatible with `<other-package>` >= X").

After adding an override, regenerate the lockfile again (`rm -rf node_modules package-lock.json && npm install`). `overrides` only take effect on a fresh resolve.

`npm` refuses to apply an override that is **narrower than a direct declaration** in `dependencies`, `devDependencies`, or `peerDependencies`. The failure mode is `EOVERRIDE: Override for X@<range> conflicts with direct dependency`. When ncu pushes a direct dep to a major that the rest of the ecosystem has not caught up to (a plugin's peer still pins the previous major), the conflict cannot be resolved by `overrides` alone: the override mechanism is for transitives, not for circumventing one's own declarations. In that case, the only honest fix is a one-line rollback of the offending direct dep to the highest version the ecosystem supports, captured in the PR description with the upstream issue/PR link that will unblock the next refresh.

## Step 5 — Peer-dependency consequences

Because the refresh bumps `peerDependencies` minima alongside everything else (Step 2), it produces a **breaking change** for any consumer pinned below the new peer minima. The refresh PR's commit message MUST therefore be `feat!:` (or `chore!:`) per Spec 13, and the release MUST be a major version bump.

This is intentional. Letting peer minima drift behind the rest of the graph defeats the point of a configs package. The major-bump cadence is the explicit price.

If a consumer must stay on an older peer (e.g. ESLint 8 in a downstream that cannot upgrade), they pin the configs package at the previous major and continue receiving Dependabot patches within that major line.

## Step 6 — Verification

After regenerating the lockfile, the maintainer MUST run the full verify pipeline locally:

```bash
npm run verify
```

This chains `format:check` and `publint` (Spec 14 Step 2). A passing `verify` proves:

- Prettier still accepts every tracked file under the new dependency versions.
- The exports map still resolves under the new `publint` major (if `publint` itself was bumped).

The maintainer SHOULD additionally run the publish dry-run:

```bash
npm publish --dry-run
```

This confirms the `files` allowlist resolves and the tarball is producible. It does NOT push to the registry.

## Step 7 — Audit re-check

After the lockfile is regenerated and `verify` passes, the maintainer MUST re-run:

```bash
npm audit --audit-level=high
```

With Spec 19 in place, this is a hard gate. A new advisory introduced by a bump blocks the refresh PR until either:

- The advisory is resolved by a further bump or an `overrides` pin.
- The suppression policy (Spec 19 Step 3) is invoked with documented justification.

## Step 8 — CI re-verification

Local `verify` is necessary but not sufficient. The refresh MUST be opened as a PR, and the `verify.yml` workflow MUST pass against the new lockfile on the pinned Node major (currently 25, per Spec 17). The PR is the audit point: every range bump, every override, and every transitive change in the lockfile is reviewable in one diff.

The PR MUST NOT be auto-merged even when verify passes. The whole point of the manual refresh is human review of cross-major bumps and override decisions. The Dependabot auto-merge policy from Spec 15 does not apply.

## Step 9 — Release

A full refresh produces a major version bump (Step 5). Tag and publish through the normal Spec 12 pipeline once the PR is merged.

The provenance attestation (Spec 16) attaches to the refreshed publish exactly as it does to a feature release; no special handling is required.

## Step 10 — Cadence and recording

The quarterly refresh SHOULD be scheduled as a maintainer task. Each refresh PR description MUST record:

- The list of majors crossed (e.g. `eslint 9 → 10`, `stylelint 16 → 17`).
- Every override introduced, with the rationale and removal condition (Step 4).
- Any advisory suppressions invoked under Spec 19 Step 3.

This record is the operational trail Spec 13's changelog and Spec 16's provenance together cannot capture by themselves: the why behind the version skew between this release and the previous one.
