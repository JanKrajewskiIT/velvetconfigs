# Spec 19 — Audit Gating and CODEOWNERS

## Step 1 — Principle

The verify pipeline currently runs `npm audit --audit-level=high` with `continue-on-error: true`. Findings are surfaced but never block a merge. For a package consumed across multiple downstream services, this is the wrong default: a `high` advisory in a dependency MUST gate the release.

CODEOWNERS routes every PR to the maintainer responsible for the changed surface. Without it, dependency-bump PRs and helper-rule changes can land without the right pair of eyes.

## Step 2 — `npm audit` becomes a hard gate

`.github/workflows/verify.yml` is amended:

- The audit step keeps `npm audit --audit-level=high`.
- `continue-on-error: true` is removed.
- The step is renamed from "Audit (advisory)" to "Audit".

This raises any `high` or `critical` advisory in the production dependency graph (`--omit=dev` is NOT used; presets-as-runtime means `dependencies` and `devDependencies` are both consumer-facing through `verify`/`prepublishOnly`).

## Step 3 — Suppression policy

Audit findings MAY be suppressed only when:

- The advisory does not apply to the package's usage (documented inline in the PR description, with the upstream advisory link).
- A fix is unavailable upstream AND the affected code path is unreachable in the preset's surface.

Suppression is implemented via `npm audit --audit-level=critical` for time-bounded windows, not via `continue-on-error`. The window MUST be tracked in an issue with a target removal date.

The suppression policy applies symmetrically to Dependabot security PRs (Spec 15): an opened security advisory that cannot be fixed within 7 days is escalated, not silenced.

## Step 4 — CODEOWNERS file

`.github/CODEOWNERS` lives at the repository root (or `.github/`; GitHub honours both). The file declares ownership per top-level area:

```
*                      @jankrajewskiit
eslint/                @jankrajewskiit
vite/                  @jankrajewskiit
stylelint/             @jankrajewskiit
prettier/              @jankrajewskiit
tsconfig/              @jankrajewskiit
nginx/                 @jankrajewskiit
husky/                 @jankrajewskiit
lint-staged/           @jankrajewskiit
.github/workflows/     @jankrajewskiit
specs/                 @jankrajewskiit
```

When additional maintainers join, the per-directory lines diverge from the catch-all so that, e.g., a Vite expert is auto-requested on `vite/` changes without being pinged for every Prettier tweak.

## Step 5 — Branch protection

The repository SHOULD configure branch protection on `main`:

- Require pull-request review from CODEOWNERS.
- Require status checks: `verify` (from `ci.yml`) AND `check-version` (publish.yml's gate, only relevant on tag pushes).
- Require branches to be up to date before merging.
- Restrict force-push and direct push.

Branch protection lives in the repository settings, not in a tracked file. The settings are described here so a new fork or restored repo can be reconfigured deterministically.

## Step 6 — Pull-request template (optional)

`.github/PULL_REQUEST_TEMPLATE.md` MAY be added with the minimum prompts:

- What surface changed? (preset name or "tooling").
- Is this additive, deprecating, or breaking under Spec 13?
- Was a downstream consumer smoke-tested?

The template is optional because Spec 13's release model already requires this information in the commit; the template is a UX nudge, not a contract.

## Step 7 — Interaction with Dependabot

Dependabot PRs (Spec 15) carry the `dependencies` label and bypass CODEOWNERS routing for review-request purposes (GitHub's default for Dependabot is to skip code-owner review unless the workflow explicitly assigns reviewers). The maintainer SHOULD enable Dependabot reviewer assignment via `reviewers:` in `.github/dependabot.yml` so the same names referenced in CODEOWNERS auto-receive bump PRs.
