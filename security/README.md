# Source security controls

The reusable `security-source.yml` workflow runs independent secrets, SAST,
workflow and infrastructure checks. Scanner failures block the workflow. Reports
remain restricted artifacts with seven-day retention; do not publish their source
excerpts or potential credentials in public logs or issues.

## SAST engine and policy

SAST uses the official Opengrep Linux x86-64 release binary. The version, download
URL and SHA-256 are pinned in [tools.json](tools.json). The shared
`scripts/security-tools.mjs` installer verifies its checksum before making the
binary available. Opengrep is licensed under
[LGPL 2.1](https://github.com/opengrep/opengrep/blob/v1.31.0/LICENSE) and declares
[support for primary constructors and other modern C# syntax](https://github.com/opengrep/opengrep/wiki/Support-for-C%23).
Compatibility with a particular project's complete source still requires a scan;
these declarations do not establish support for every preview C# feature.

The scanner runs inside a Debian-based `buildpack-deps` runtime image pinned by
digest in `tools.json`. Its SCM variant includes Git, which the scanner needs for
repository file discovery and ignore handling. It has no network access, runs
with the runner's unprivileged user and mounts the source, local policy, upstream
rules and verified binary read-only. Temporary extraction and cache files use
the container's temporary filesystem. No scanner credentials are forwarded to
the container.

The container sets `LC_ALL=C.UTF-8` so Opengrep's embedded Python reads rule
files using UTF-8 rather than the minimal runtime's ASCII locale.

The Vite preset reads its shipped tsconfig through Node's file API using a
module-relative URL. The pinned Opengrep JavaScript parser does not accept JSON
import attributes; this equivalent load keeps the preset available to analysis
without excluding the file or relaxing `--strict`.

The local [semgrep.yml](semgrep.yml) policy and the upstream
`semgrep/semgrep-rules` commit remain unchanged. Their Semgrep names identify the
rule format and upstream repository, not the active engine. JavaScript,
TypeScript and C# continue to use the same rule directories, `ERROR` severity,
`--error` and `--strict`. Do not suppress partial parsing or exclude C# to make a
scan pass.

Even a zero exit code is rejected if the JSON report is malformed, incomplete,
contains scan errors or lists no scanned files.

SAST artifacts are now `opengrep.json` and `opengrep.json.stderr.log`; the source
workflow still uploads them as `security-sast`. Gitleaks behavior and historical
findings are unchanged. Potentially active historical credentials must be revoked
and reviewed before any separate baseline or history-cleanup decision.

## SPA security tooling

`configs-spa` copies the image verification scripts and their policy files into
`.deployment/spa`. The scanner installer imports `security-tool-directory.mjs`,
which must accompany `security-tools.mjs` in the artifact's `scripts/` directory.
The image workflow uses this artifact directly, without a Configs checkout.

Changes to this file list require a new Configs npm release, a consumer lockfile
update and a fresh `npm run build:spa` after the application build. Updating only
a reusable workflow SHA or rerunning verification on an older SPA artifact does
not update the artifact contents. Do not add missing files after image verification;
prepare the complete context before building and scanning the image.

The SPA runtime uses the official Nginx Alpine slim image, pinned by digest in
`docker/Dockerfile.spa`. The generated configuration needs core HTTP, gzip and
static-file support, but no optional image-filter, XSLT, GeoIP, njs or ACME
modules. The full Alpine variant adds those modules and their dependencies,
including libraries flagged as `CVE-2026-77214` (`libexpat`) and
`CVE-2026-88806` (`libx11`). Use the slim variant rather than accepting these
findings as exceptions. A base-image change follows the same npm release,
consumer lockfile update and fresh artifact procedure above. The final image
still requires the existing Nginx/HTTP verification and Trivy gate; inspecting
the upstream Dockerfile does not establish a passing scan.

## WAF image updates

The WAF uses a dated OWASP CRS Nginx Alpine release with an immutable digest.
The upstream Alpine build upgrades OS packages before assembling the runtime.
It supports the same backend, port and ModSecurity environment settings used by
the deployment preset. This changes the OS package inventory; the Trivy scan and
benign-request/SQL-injection checks must still pass before deployment.

Keep `images.waf` in `tools.json` and the image in `waf.compose.yml` aligned.
`configs-spa` includes both files in the SPA artifact. Recron takes its deployment
preset from this artifact and requires its image to match both `images.waf` and
the successful WAF report's `ArtifactName`. An older workflow tooling checkout
must not supply a different WAF image after verification. Missing files or a
mismatch block deployment. Periodic image-scan inventories must use the same pin.

Publish these Configs changes together, refresh the consumer lockfile and create
a fresh SPA artifact. A workflow SHA update alone cannot replace the embedded
WAF pin and its image exception policy.

The repository owner approved a temporary exception on 2026-10-19 for
`CVE-2026-88806` in `libx11 1.8.13-r0`, with `HIGH` severity. The exact image
references, digest, rationale and expiry are recorded in
[image-exceptions.json](image-exceptions.json). Its two entries cover the same
pinned image: the tagged reference used by the SPA gate and the repository digest
returned by Docker for periodic scans. This accepts the identified risk without
remediating the package; other findings remain blocking. The exception expires
at 23:59:59 UTC on 2026-10-25 and must be removed when a patched WAF image is
adopted. The scanner rejects expired exceptions.

## Adopting this migration

Updating local Configs files does not update an already published reusable
workflow. External consumers also use the immutable Configs checkout inside
`security-source.yml` to load scanner scripts and `tools.json`.

If a consumer still produces `semgrep.json`, inspect both its reusable workflow
reference and the external `tooling` checkout in that workflow. Updating the npm
package alone changes neither reference. A rerun of an older workflow revision
also retains that revision's scanner configuration.

An internal tooling pin update requires publishing a new workflow commit and
pinning consumers to that resulting commit. An existing release tag still loads
its original workflow bytes, even after the internal pin is changed locally.
When the npm package already contains the required policy, this workflow-only
publication does not require another npm release or retagging the package.

1. Review and publish a Configs commit containing the Opengrep binary metadata,
   runtime pin, shared tool-directory helper and scanner changes. The Configs
   repository's own source workflow reads its local checkout.
2. Pin `security-source.yml`'s external `tooling` checkout to that published commit
   and publish the workflow update. Do not invent a future SHA or reuse a tag for
   changed bytes. Keeping the old tooling checkout will load the old scanner.
3. Update consumer reusable workflow references to the resulting published
   workflow commit. This includes both direct security calls and callers of
   `verify-package.yml`, which invokes source scanning itself.
4. Run the source security workflow against the consumer. Confirm that SAST uses
   Opengrep, produces its JSON report and completes without parsing errors. A
   prepared configuration alone is not successful scan evidence.

For a manually prepared Linux workspace, install the pinned scanner with
`node tooling/scripts/security-tools.mjs opengrep`, then use
`node tooling/scripts/scan-source.mjs sast source reports rules`. The `source`,
`tooling` and `rules` directories must contain the consumer checkout, the matching
Configs scripts/policy and the upstream rules checkout at the pinned commit.
These commands download or run tooling and are not automatically authorized by
editing the configuration.
