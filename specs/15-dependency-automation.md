# Spec 15 — Dependency Automation

## Step 1 — Principle

A shared-configs package has one job: centralize tooling versions across consumers. If those versions drift, the package loses its reason to exist. Dependency updates MUST be automated; they MUST NOT depend on a maintainer remembering to bump.

The repository ships a Dependabot configuration covering both the npm registry (the package's own `dependencies` and `devDependencies`) and GitHub Actions (workflow action versions). Renovate is an acceptable alternative when the consuming organization standardizes on it; the rest of this spec is written for Dependabot but applies symmetrically.

## Step 2 — File location and shape

The configuration lives at `.github/dependabot.yml`. It MUST declare two ecosystems:

- `package-ecosystem: "npm"` with `directory: "/"` and a `schedule.interval` of `weekly`. The `groups` block bundles `eslint-*`, `stylelint-*`, `prettier-*`, `typescript-eslint`, `vite-*`, `husky`, `lint-staged`, and `publint` so that related plugins land in one PR instead of one PR per plugin.
- `package-ecosystem: "github-actions"` with `directory: "/"` and a matching weekly schedule. This catches `actions/checkout`, `actions/setup-node`, and any third-party actions adopted later.

Both ecosystems set:

- `open-pull-requests-limit: 10` — enough headroom for grouped updates without flooding review.
- `commit-message.prefix: "chore"` — Conventional Commits compatible; Spec 13 treats `chore:` as patch-level.
- `labels: ["dependencies"]` — for triage and release-note filtering.

## Step 3 — Update policy

- Minor and patch updates: auto-mergeable when the verify workflow succeeds. Repository maintainers SHOULD enable GitHub auto-merge on Dependabot PRs that pass `verify`.
- Major updates: never auto-merged. Each major bump requires a maintainer to review changelogs, run a smoke check against a consumer, and decide whether the bump is additive or breaking under Spec 13.
- Security advisories (`security-updates: true` is Dependabot default): always opened immediately, regardless of schedule. Treated as `fix:` in commit messages so Spec 13 promotes them to a patch release.

## Step 4 — Interaction with the verify pipeline

Every Dependabot PR triggers `ci.yml`, which fans into `verify.yml`. A failed verify run blocks auto-merge automatically. No additional gate is required.

The repository MUST NOT add Dependabot-only verification steps. The same `verify` script that runs locally is the same script that gates Dependabot. Divergence between local and CI verification is a release-quality bug.

## Step 5 — Out of scope

- Dependabot does not version-bump the package itself. Spec 13 (manual `npm version`) remains the only release path.
- Dependabot does not edit `package-lock.json` independently of `package.json`. Lockfile-only refreshes are handled by Spec 19 (manual `ncu`/refresh, Steps 8+) so that the maintainer reviews the diff intentionally.
- Dependabot does not update the Node version pin (`engines.node`, workflow `node-version`, `.nvmrc`). Node major bumps are an architectural decision per Spec 13 and Spec 17.
