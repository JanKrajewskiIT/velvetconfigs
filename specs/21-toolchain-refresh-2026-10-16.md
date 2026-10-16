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
| Published VelvetConfigs    | 3.7.8                                   |
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

The latest published Configs workflow release is 3.7.8 at commit
`1dd61907da1462e58baab72e5d96c323763fc24a`. Consumer workflow calls and explicit
tooling checkouts use that commit instead of the older 3.7.0 commit or the unpinned
3.5.0 tag.

The new scanner pins, updated shared workflows and patched SPA image template are
local changes after that release. Installing Configs 3.7.8 or selecting its commit
does not include these unpublished changes.

1. Verify and release the updated Configs package and workflows under a new version;
   do not replace the existing 3.7.8 package or tag.
2. Once the release commit exists, update the immutable tooling checkouts in shared
   workflows and the consumer workflow calls to that real commit. Resolve any
   additional release needed to publish those updated checkout pins.
3. Update consumer Configs dependencies and lockfiles to the new published version.
   Build fresh SPA artifacts so the shared image template and scanner metadata are
   included in the downloaded CI context.
4. If library releases are also prepared, publish Auth, I18n and Reactive before Ui,
   and Ui before Data; refresh the application dependencies after publication.

## Validation boundary

Only dependency updates were authorized for execution. `npm run verify` remains
unrun in all eight scoped package directories, as do container builds and scans.
`--ignore-scripts` prevents install lifecycle scripts from running.

After regenerating an SPA artifact and building its matching image, the remaining
runtime checks are `node .deployment/spa/verify-spa.mjs velvet-spa:verified` and
`node .deployment/spa/scripts/scan-image.mjs velvet-spa:verified reports/image`,
from VelvetDemo or Recron/recron-web. The image scan also requires the repository's
checksum-pinned Trivy installation on the Linux CI runner. These checks have not
been executed as part of this refresh.
