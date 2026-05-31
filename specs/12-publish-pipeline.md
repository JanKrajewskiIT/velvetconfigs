# Spec 12 — Publish Pipeline

## Step 1 — Trigger

Create `.github/workflows/publish.yml` triggered EXCLUSIVELY by tag pushes matching `v*`. The workflow MUST NOT trigger on branch pushes or pull requests. Publishing is intentional and gated by a human-driven tag.

## Step 2 — Job graph

The workflow contains three jobs running sequentially via `needs`:

1. `verify` — invokes the reusable verify workflow (`uses: ./.github/workflows/verify.yml`). This re-runs every verify step against the tagged commit. The publish run cannot succeed if the tagged commit cannot pass the same gates as a PR.
2. `check-version` — depends on `verify`. Confirms that the `package.json` version exactly matches the tag.
3. `publish` — depends on `check-version`. Performs the actual publish.

Each step is its own job for two reasons: failures in any step short-circuit downstream jobs without performing setup work, and permissions are scoped down per job (only `publish` needs write access to the registry).

## Step 3 — `check-version` job

Runs on `ubuntu-latest`. Steps:

- `actions/checkout` — fetches the tagged commit.
- A shell step that:
  - Reads the version from `package.json` using `node -p "require('./package.json').version"`.
  - Strips the leading `v` from `GITHUB_REF_NAME` to derive the tag's semantic version.
  - Compares the two values literally.
  - On mismatch, emits a GitHub error annotation (`::error::...`) and exits non-zero. The annotation appears prominently on the workflow summary page.

This guard prevents a common failure mode where a contributor tags a commit before remembering to bump the manifest version. The publish job therefore never runs against a mismatched commit.

## Step 4 — `publish` job permissions

Declare `permissions: { contents: read, packages: write }`. `packages: write` is the minimum permission needed to publish to GitHub Packages; broader scopes (e.g. `id-token: write` for OIDC trusted publishing) are added only when the target registry requires them.

## Step 5 — `publish` job steps

Steps:

1. `actions/checkout` — fetch the tagged commit.
2. `actions/setup-node` with:
   - `node-version` matching the publish Node major.
   - `registry-url: 'https://npm.pkg.github.com'` — wires the implicit `.npmrc` for GitHub Packages.
   - `scope` set to the package's npm scope.
   - `cache: 'npm'`.
3. `npm ci` — install dependencies needed by `prepublishOnly` (publint, Prettier).
4. `npm publish`. The job sets `NODE_AUTH_TOKEN` from `secrets.GITHUB_TOKEN` so the publish call authenticates against GitHub Packages using the workflow's automatically-issued token. No long-lived PAT is required.

The `prepublishOnly` script in `package.json` runs the verify chain locally inside the job before npm uploads the tarball. This is the third layer of verification (CI on PR, CI on tag verify, prepublishOnly inside publish) — redundant by design.

## Step 6 — Publishing to npmjs.org instead

When targeting the public npm registry:

- Change `registry-url` to `https://registry.npmjs.org`.
- Replace `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` with `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` and provision an automation token in npmjs.
- Update `publishConfig.registry` in `package.json` accordingly.
- Remove `packages: write` from the publish job permissions; it is GitHub-Packages-specific.

The workflow shape (verify → check-version → publish) is identical between registries.

## Step 7 — Tag conventions

- Tags follow `vX.Y.Z`, matching the `package.json` version with a `v` prefix.
- Pre-release tags follow `vX.Y.Z-<channel>.<n>` (e.g. `v1.0.0-rc.1`). Channel-based tags require additional handling in the publish job (`npm publish --tag <channel>`); the default `latest` dist-tag must NOT receive pre-releases.
- Once published, tags are immutable. Re-publishing a version is impossible because the registry refuses overwrites; mistakes are recovered by publishing a new patch.

## Step 8 — Failure recovery

- A failure in `verify`: fix the underlying issue on `main`, advance the tag to the new commit (delete and re-create the tag locally, force-push it), and re-run.
- A failure in `check-version`: bump `package.json`, commit, re-tag at the new commit.
- A failure in `publish`: investigate the registry error. Common causes are credential expiry, package name conflicts on first publish, or a registry outage. Tag must be advanced to a new commit only if the underlying code changed.

## Step 9 — Notification surface

The workflow itself produces no Slack/Discord/email notifications. Notifications are handled by GitHub's built-in workflow notification settings or a separate workflow file. Coupling notifications into the publish workflow muddies the failure-recovery story above.

## Step 10 — Operational checklist (release author)

1. Ensure `main` is green on the verify workflow.
2. Bump the version locally (`npm version patch | minor | major`), producing a commit AND a tag.
3. Push the commit and the tag to `origin`.
4. Watch the publish workflow run. The three-job chain provides clear failure boundaries.
5. On success, the registry hosts the new version; consumers can upgrade.
