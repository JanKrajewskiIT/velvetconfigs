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

## Adopting this migration

Updating local Configs files does not update an already published reusable
workflow. External consumers also use the immutable Configs checkout inside
`security-source.yml` to load scanner scripts and `tools.json`.

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
