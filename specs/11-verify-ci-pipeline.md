# Spec 11 — Verify CI Pipeline

## Step 1 — Pipeline topology

The repository ships three GitHub Actions workflow files under `.github/workflows/`:

- `verify.yml` — reusable workflow callable via `workflow_call`. Encapsulates the verify steps.
- `ci.yml` — public entrypoint triggered on push and pull requests against `main`. Invokes `verify.yml`.
- `publish.yml` — covered in Spec 12.

Splitting verify into a reusable workflow lets the publish workflow execute the same verification before publishing without duplicating the step list.

## Step 2 — `verify.yml` declaration

The workflow MUST:

- Declare `on: workflow_call` with a `secrets` block that accepts an optional `GHCR_TOKEN`. Even though the verify path does not strictly require the token, accepting it lets the workflow access the GitHub Packages registry for any private dependency.
- Define a single job `verify` running on `ubuntu-latest`.
- Declare `permissions: { contents: read, packages: read }` so the job can checkout and pull from GitHub Packages but cannot accidentally push.
- Surface `GHCR_TOKEN` as an env var on the job so `actions/setup-node`'s npm authentication can resolve scoped packages from GitHub Packages without leaking the token into nested commands.

## Step 3 — Node matrix

Use a job-level matrix on `node-version`. Pin the matrix to the active maintenance Node majors the package supports (the minimum is enforced by `engines.node` in the manifest). A one-entry matrix is acceptable when the package targets a single Node major; the matrix shape remains so future majors can be added without restructuring.

Each matrix entry runs the same step list in isolation.

## Step 4 — Steps

The job MUST execute these steps in order:

1. `actions/checkout` (pinned to a major version) — fetch the repository.
2. `actions/setup-node` (pinned to a major version) with:
   - `node-version` taken from the matrix entry.
   - `scope` set to the package's npm scope (required so the implicit `.npmrc` is wired for GitHub Packages).
   - `cache: 'npm'` to enable the action's built-in dependency cache keyed on the lockfile.
3. `npm ci` — install from the lockfile. `ci` is mandatory; `install` is forbidden because it can mutate the lockfile silently.
4. An advisory audit step that runs `npm audit --audit-level=high` with `continue-on-error: true`. The intent is reporting, not gating; a high-severity advisory does not fail the build but is surfaced in the log.
5. `npm run verify` — runs the package's own verify script (Prettier check + publint). See Spec 14 for the script definition.

## Step 5 — `ci.yml` entrypoint

The CI workflow MUST:

- Declare `on: { push: { branches: [main] }, pull_request: { branches: [main] } }`.
- Have a single job that uses the local reusable workflow via `uses: ./.github/workflows/verify.yml`.
- Forward `secrets: { GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }} }` to the reusable workflow.

No additional steps live in `ci.yml`; it is a thin entrypoint. Adding gating logic here (instead of in verify.yml) would defeat the reusable-workflow split.

## Step 6 — Failure semantics

- A failing verify step fails the job and blocks the pull request via branch protection (configured in the repository settings, outside the workflow file).
- The advisory audit step never fails the job. Surface vulnerabilities are caught by Dependabot or manual audit reviews, not by gating PRs.

## Step 7 — Secrets handling

- `GHCR_TOKEN` is the only secret consumed.
- The token MUST be a fine-grained personal access token (or a registry token) with read access to the relevant package(s). For public packages, the secret can be left empty and the workflow still succeeds.
- The workflow MUST NOT echo, print, or log the token. `actions/setup-node` consumes it implicitly via the generated `.npmrc`.

## Step 8 — Branch protection (operational)

Outside the workflow files themselves, the repository settings MUST require:

- The verify workflow to succeed before merging into `main`.
- Linear history or rebase/squash merge strategy (the workflow itself is indifferent, but release tagging in Spec 12 assumes a clean main history).

## Step 9 — Local parity

Running `npm run verify` locally produces the same result as the CI verify step. Developers can — and SHOULD — run it before pushing. The pre-commit hook (Spec 09) catches formatting drift; the verify script catches packaging drift (publint).
