# Code quality controls

`code-quality.json` belongs to the consumer. Configs owns its schema, scanner wrappers and defaults.
All eight frontend projects run `quality:check` from their existing `verify` command. No tests or coverage gate are added.

## Local and CI gates

| Control              | Behavior                                                                                               | Output                              |
| -------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| `architecture:check` | Blocks import cycles, unresolved imports, undeclared packages and forbidden boundaries                 | `reports/quality/architecture.json` |
| `duplicates:report`  | Reports clones of at least 100 tokens and 10 lines; an explicitly configured budget blocks regressions | `reports/quality/duplicates.json`   |
| `deps:strict`        | Blocks Knip findings; public library entry exports are retained                                        | `reports/quality/unused-code.json`  |
| ESLint               | Type-aware Promise handling, public package imports and justified, current suppressions                | Normal lint output                  |

Browser sources cannot import Node built-ins. Libraries cannot import applications or depend on development-only packages
at runtime. Type-only dependencies on development packages and declared peer dependencies remain supported.
Recron additionally keeps `lib`, `domain` and `api` independent of feature modules; domain modules do not depend on
transport, application configuration, Solid or UI code. Feature-to-feature imports are not universally forbidden:
the data provider and workflows intentionally coordinate several features.

The resolver honors TypeScript paths and package exports. The wrapper reads the consumer's inherited TypeScript
configuration and enables path resolution only when `paths` or `baseUrl` is configured, preventing local directories
from shadowing installed packages through an implicit root alias. Declared dependencies remain valid when optional
peer metadata also classifies them as undeclared. Output exclusions apply to project files, preserving package exports
under `node_modules` directories such as `dist`.
Scanners require installed consumer dependencies and run
through their local JavaScript executables with no shell interpolation. Missing tools, crashes and invalid/empty reports
fail the command. Architecture reports and duplication summaries contain paths and positions, never source fragments.
Transient raw duplication output is removed after scanning. The reusable verification workflow uploads only named JSON
reports, with seven-day retention; it does not upload temporary scanner configuration or raw source excerpts.
Each command removes its previous report before scanning, so a failed invocation cannot leave an old passing report
under that command's output name.

`dependency-cruiser` and `jscpd` are development dependencies, invoked dynamically by Configs wrappers. Their exact
Knip `ignoreDependencies` entries express that ownership; they are not exceptions for application dependencies.
The exact `lint-staged` dependency exclusion covers invocation through the sourced `husky/pre-commit.sh` hook,
which Knip does not follow. Trivy is an external binary supplied by the pinned security tooling rather than npm,
so only that binary is excluded from npm dependency findings.
Published compatibility exports carry `@alias` annotations so duplicate-export checks retain the default lint-staged
configuration and the deprecated `readPeerDependencies` name without excluding their modules from analysis.
`deps:check` remains an optional nonblocking diagnostic command. CI uses `deps:strict` once through `quality:check`.
Do not fix a Knip finding by ignoring a whole source directory or removing an intentionally published API.

Jscpd stays on the maintained JavaScript 4.x line (`~4.3.0`). The 5.x line uses native binaries; the JavaScript line works
with the ecosystem's `npm ci --ignore-scripts` policy and the existing Node runtime. Neither scanner enters SPA bundles.

There is deliberately no invented duplication percentage. After reviewing the first report, add a measured limit:

```json
"duplication": { "maxPercentage": 5 }
```

The number above illustrates syntax, not a proposed baseline. Lower the accepted percentage as copies are removed.
Generated API declarations, snapshots, reference sources and build output are excluded. Similar presentation code is
not automatically a reason to extract a shared abstraction.

From VelvetConfigs, a local cross-repository report can be produced with:

```powershell
npm run duplicates:report -- ../VelvetReactive/src ../VelvetUi/src ../VelvetData/src ../VelvetAuth/src ../VelvetI18n/src ../VelvetDemo/src ../Recron/recron-web/src
```

Explicit roots produce a report without applying one project's percentage budget to unrelated projects.
No scheduled job receives broad credentials merely to clone every private repository.

## Detached asynchronous work

The shared type-aware ESLint preset sets `no-misused-promises` to `error` and `no-floating-promises` with
`ignoreVoid: false`. `void` therefore no longer substitutes for rejection handling. Event-triggered operations handle
their rejection explicitly. Existing local error state is preserved; unexpected UI failures go through `reportAsyncError`,
which emits a generic console diagnostic and a payload-free `velvet:async-error` event. Applications subscribe under
their runtime owner and record the `async` category in their bounded local diagnostics. No external telemetry is added.
Rendering error callbacks remain separate from this event. Callback reporters supplied by consumers own their redaction.

Unused lint suppressions and unused inline configuration are errors. A local suppression must name the rule and include
its reason after `--`; blanket disables are rejected. Exceptions remain adjacent to the exact behavior they justify.

## CodeQL and GitHub Code Quality

The reusable `codeql-analysis.yml` scans JavaScript/TypeScript with `security-and-quality`: it includes the security
extended suite plus reliability and maintainability queries. It does not install application packages, run npm lifecycle
scripts, build an application or upload the CodeQL database. The pinned CodeQL action uploads results to GitHub code
scanning. A separate report gate blocks security severity of 7 or higher and quality results at `error` level, including
existing findings. Scanner/report failures also block. Lower-severity findings remain visible for review.

Each repository has a wrapper for PRs, main, manual execution and Tuesday 06:41 UTC. CodeQL runs for every configured
trigger regardless of repository visibility, without requiring an opt-in variable. Private repositories still require
eligibility (an organization on Team/Enterprise with GitHub Code Security) and Code Security enabled to upload results.
If code scanning is unavailable or disabled, the run fails during upload instead of skipping the analysis.
The existing mandatory Semgrep, secrets, workflow, infrastructure and dependency gates remain in force.
For advanced CodeQL setup, disable conflicting GitHub default setup before enabling this workflow.

The GitHub **Code Quality** product is a separate licensed service, not activated by a checked-in workflow or by
`security-and-quality`. This implementation provides deterministic quality scanning through CodeQL, ESLint, Knip and
jscpd without pretending that the native dashboard has been enabled. If the native service is desired, enable it in
repository/organization settings and configure quality rulesets without coverage requirements. No SonarQube server,
subscription, account or AI autofix service is provisioned, and no purchased service is silently enabled.

After CodeQL activation, require its status check in the branch ruleset. Repository settings cannot be enforced by this
package. Review the initial findings before rollout; no fabricated baseline or blanket suppression has been introduced.

## Release and remaining validation

These changes extend the already prepared, unpublished Configs 3.6.0 release. Consumers require Configs `^3.6.0`.
Publish Configs first, refresh consumer lockfiles/dependencies and publish the coordinated libraries before apps.
Auth's bootstrap correction is prepared as 3.5.5; Ui, Demo and Recron request that minimum. I18n's runtime is unchanged,
so its package version is retained while its development tooling requires Configs 3.6.
CodeQL wrappers reference the immutable Configs commit for `v3.6.0`, with the version retained in a comment.
Refresh existing Configs verification workflow pins to that same commit so quality artifacts are uploaded.
No commit, tag, package installation, lockfile update, scan, lint, type check, build or test was performed for this change.

After publication, in each frontend project (Configs, Reactive, Ui, Data, Auth, I18n, Demo and `Recron/recron-web`):

```powershell
npm install --ignore-scripts
npm run lint
npm run quality:check
npm run format:check
```

Those checks remain unrun. The new scanners are not installed in this workspace; install/lockfile refresh comes first.
`npm run verify` is the full CI-equivalent command and also builds these projects, so it was not run. Run the CodeQL
workflow on GitHub after enabling the feature and replacing its workflow pin. No claim is made that the new gates or
their initial findings have already passed.

References: [CodeQL query suites](https://codeql.github.com/codeql-query-help/javascript/),
[GitHub Code Quality](https://docs.github.com/en/code-security/concepts/code-quality/code-quality),
[dependency-cruiser](https://github.com/sverweij/dependency-cruiser),
[jscpd JavaScript documentation](https://github.com/kucherenko/jscpd/blob/master/README-v4.md).
