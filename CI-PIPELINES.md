# CI pipelines

Package publication runs independently of security and code quality reporting.
Build failures, missing artifacts, archive identity mismatches and signing failures
stop publication.

| Workflow                      | Trigger                            | Responsibility                                                     |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `publish.yml`                 | Push of a `v*` tag                 | Build, sign and publish the npm package to GitHub Packages.        |
| `ci.yml` calling `verify.yml` | Push to main, pull request, manual | Run the existing quality checks and retain results for correction. |
| `security.yml`                | Monday 05:23 UTC or manual         | Source security and dependency audits.                             |
| `codeql.yml`                  | Tuesday 06:41 UTC or manual        | CodeQL security and quality analysis.                              |

Cron times use UTC, so their local time changes with daylight saving time.
Security and CodeQL have no push or pull-request trigger. They are not dependencies
of delivery workflows. A report may fail its own workflow to keep findings and
scanner failures visible; it does not turn them into successful scan evidence.

Quality runs every check declared by the existing `verify` script, including
architecture, duplication and unused-dependency checks, even when an earlier
check fails. Results appear in the run summary and the `code-quality` artifact.
Detailed command diagnostics remain in the job logs. Dependencies are reported
in `dependency-security`; source findings in `security-*`; CodeQL in
`codeql-sarif`. Report artifacts have seven-day retention and remain accessible
through the repository's Actions permissions. Download reports before expiry
when tracking a correction for longer.

This repository owns `build-package.yml`, `build-spa.yml`, `quality-package.yml`,
`security-dependencies.yml` and `security-spa.yml`. Its own workflows use these
local definitions. Consumer repositories pin shared workflows to a VelvetConfigs
release commit. When a shared workflow checks out tooling, it loads scripts and
policy from the commit that defines the workflow job. Consumers adopt updates by
changing their workflow references to the new release commit.

SBOM generation inventories dependencies without checking advisory databases.
Retaining and signing an SBOM on the delivery path does not establish a clean
security scan. Existing developer `verify`, lint and audit commands remain strict.

GitHub repository rules are separate from workflow dependencies. If an existing
branch protection rule, ruleset, required workflow or environment deployment rule
requires security or quality success, remove that reporting check from the required
set to apply this policy there too. Keep delivery/build checks required as needed.
Repository settings have not been changed by this configuration edit.

## Verification

Run `npm run verify` from the repository root for the local quality gate.
GitHub Actions records publication and security results in their respective runs.
