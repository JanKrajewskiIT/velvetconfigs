# Toolchain refresh — 2026-10-16

## Scope

This refresh covers VelvetAuth, VelvetConfigs, VelvetData, VelvetDemo, VelvetI18n,
VelvetReactive, VelvetUi and Recron/recron-web, including the Recron workflows that
build and deploy the frontend. Existing application and staged Recron changes are
preserved.

## Resolved versions

| Component                  | Selected version                        |
| -------------------------- | --------------------------------------- |
| Node.js                    | 26.12.0 (existing Node 26 declarations) |
| npm                        | 12.2.0, already current                 |
| Published VelvetConfigs    | 3.7.10                                  |
| Published Velvet libraries | 3.7.5, already current                  |
| Trivy binary and image     | 0.76.0                                  |
| Semgrep image              | 1.181.0                                 |
| Zizmor image               | 1.31.1                                  |
| ZAP image                  | Refreshed `stable` digest               |
| CodeQL action              | 4.39.0                                  |
| GitHub cache action        | 6.1.0                                   |
| GitHub setup-dotnet action | 6.0.0                                   |

Public direct npm dependencies were compared with their registry `latest` versions;
their existing declarations already select those versions. The TypeScript native
compiler and TypeScript 6 API aliases retain their separate responsibilities.
Consumer Configs minimums advance from 3.7.5 to 3.7.8. `npm update --ignore-scripts`
completed in VelvetConfigs and refreshed its dependency tree and lockfile. The next
update, in VelvetAuth, failed with GitHub Packages HTTP 401. The user requested no
further private package downloads, so updates in the remaining packages were not run.

The five library lockfiles use the exact Configs 3.7.8 archive URL and integrity
already recorded in VelvetDemo's existing lockfile. Configs 3.7.5 and 3.7.8 declare
the same dependencies, peers, binaries and engine requirements, so these edits do
not require a different dependency graph. Their manifests and lockfiles agree, but
their installed private packages have not been refreshed. Transitive dependency
updates outside VelvetConfigs remain incomplete.

Image digests come from Docker Hub and GHCR manifests. The Trivy archive checksum
comes from its GitHub release asset metadata. Other existing action, scanner,
Cosign and WAF pins were compared with their upstream releases and retained when
already current. Semgrep rules use a refreshed immutable upstream commit.

## Release handoff

Configs 3.7.10 is now published at commit
`b3237eb74b340e5d039a3383361d683d04629028`, verified against the remote annotated
tag. All consumer workflow calls and explicit tooling checkouts now select that
immutable commit.

The user declined registry access for the follow-up. Consumer npm manifests retain
`^3.7.8` and their lockfiles retain 3.7.8; neither metadata nor private package
archives were fetched. Raising the npm minimum to 3.7.10 remains deferred until its
archive URL and integrity can be resolved through an authorized registry request.

Release 3.7.10 still hardcodes the 3.7.8 tooling checkout in `publish-package.yml`,
`security-source.yml`, `security-images.yml` and `security-dast.yml`. Their local
sources now pin the verified 3.7.10 commit, so their next release will load the
updated scanner and signing metadata from that existing release. This source fix
is not part of the existing 3.7.10 release.

1. Verify and publish the tooling checkout fix under a new Configs version without
   replacing the existing package or tag.
2. Once its release commit exists, update consumer workflow calls and explicit
   tooling checkouts to that real commit. The shared workflows' own tooling pin
   can remain on 3.7.10 while its scanner and signing metadata remain unchanged.
3. When registry access is authorized, refresh consumer Configs dependencies and
   lockfiles together. Build fresh SPA artifacts so the selected image template
   and scanner metadata are included in the downloaded CI context.
4. If library releases are also prepared, publish Auth, I18n and Reactive before Ui,
   and Ui before Data; refresh the application dependencies after publication.

## Validation boundary

Only dependency updates were authorized for execution. `npm run verify` remains
unrun in all eight scoped package directories, as do container builds and scans.
`--ignore-scripts` prevents install lifecycle scripts from running.

In the 3.7.10 follow-up, the user declined
`npm install --package-lock-only --ignore-scripts --no-audit --no-fund` in all seven
consumer package directories. That command was not run, and no verification
commands were run. Registry access is needed before the package lockfiles can be
advanced; workflow references were updated through local file edits only.

After regenerating an SPA artifact and building its matching image, the remaining
runtime checks are `node .deployment/spa/verify-spa.mjs velvet-spa:verified` and
`node .deployment/spa/scripts/scan-image.mjs velvet-spa:verified reports/image`,
from VelvetDemo or Recron/recron-web. The image scan also requires the repository's
checksum-pinned Trivy installation on the Linux CI runner. These checks have not
been executed as part of this refresh.
