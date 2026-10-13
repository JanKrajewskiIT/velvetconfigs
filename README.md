# @jankrajewskiit/configs

Shared tooling presets (ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged, Husky, Nginx) for SolidJS apps and libraries.

## Install

Route the package scope to GitHub Packages in the consumer's `.npmrc`:

```ini
@jankrajewskiit:registry=https://npm.pkg.github.com
```

When the package requires authentication, also configure a token with `read:packages` access without committing its value:

```ini
//npm.pkg.github.com/:_authToken=${GHCR_TOKEN}
```

```sh
npm install --save-dev @jankrajewskiit/configs
```

Tool runtimes are optional peers. Install only the ones you run: `eslint` (`^10.0.0`), `prettier` (`^3.0.0`), `stylelint` (`^17.0.0`), `stylelint-config-standard` (`^40.0.0`), `typescript` (`>=6.0.0 <6.1.0`), `vite` (`^8.0.0`), and `lint-staged` (`^17.0.0`). Preset plugins are regular dependencies. `eslint-plugin-jsx-a11y` still declares ESLint 9 as its newest peer, so every consumer using ESLint 10 sets the root override `"overrides": { "eslint": "$eslint" }`. The preset also adapts legacy rule APIs with `@eslint/compat`; the override controls dependency resolution, not rule behavior.

To compile with TypeScript 7, keep `typescript` on the 6.0.x line for `typescript-eslint` (it needs the JavaScript API and declares `typescript <6.1.0`) and install the native compiler under another name: `"typescript": "npm:@typescript/typescript6@~6.0.2"` and `"@typescript/native": "npm:typescript@^7.0.2"`. `tsc` then runs version 7 and `tsc6` runs version 6.

The workflow signs npm archives and dependency SBOMs with Cosign. npm provenance is an explicit registry-specific opt-in, disabled for GitHub Packages by default. Where registry signatures are supported, inspect them with:

```sh
npm audit signatures
```

## Subpath exports

| Subpath                   | Purpose                                            |
| ------------------------- | -------------------------------------------------- |
| `./eslint`                | ESLint flat-config factories and selector builders |
| `./prettier`              | Prettier preset                                    |
| `./stylelint`             | Stylelint preset                                   |
| `./stylelint/velvet`      | Velvet global class and keyframe naming            |
| `./tsconfig/app`          | Browser app TypeScript baseline                    |
| `./tsconfig/node`         | Node TypeScript baseline                           |
| `./tsconfig/app-vite`     | App baseline plus Vite client types                |
| `./tsconfig/node-vite`    | Node baseline plus Node types                      |
| `./tsconfig/lib`          | Library baseline emitting declarations             |
| `./tsconfig/test`         | App baseline plus Vitest and Testing Library types |
| `./vite`                  | Vite config factories for Solid apps and libraries |
| `./lint-staged`           | lint-staged factory and default config             |
| `./husky/pre-commit`      | Husky pre-commit snippet to source                 |
| `./nginx/spa`             | Nginx SPA server block                             |
| `./env`                   | Public build environment validation                |
| `./nginx`                 | Typed Nginx SPA policy factory                     |
| `./tsconfig/declarations` | Strict NodeNext declaration validation             |
| `./editor/settings`       | Shared editor settings template                    |
| `./editor/extensions`     | Shared editor recommendations                      |

## Usage

### ESLint

`tsconfigRootDir` is required; both factories throw without it. `environments` accepts `browser`, `node`, `worker`, `serviceworker`, `jest`, and `vitest` and merges their globals (default `['browser']`). Files outside `typedFiles` receive no type-aware rules, so list every directory with TypeScript sources there.

Legacy plugin APIs are adapted inside the preset with `@eslint/compat`; consumers do not need additional wrappers for CSS Modules.

```js
// eslint.config.mjs
import {
  buildAllowEmptyInterfaceConfig,
  buildLiteralI18nKeySelectors,
  buildNoChildrenPropSelectors,
  buildRuleOverrideConfig,
  buildSolidHtmlForCompatConfig,
  createEslintConfig,
} from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser', 'vitest'],
  extraConfigs: [
    buildRuleOverrideConfig({
      name: 'app/component-props',
      files: ['src/**/*.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...buildNoChildrenPropSelectors([{ component: 'Button', prop: 'label', forbid: ['children', 'title'] }]),
          ...buildLiteralI18nKeySelectors(),
        ],
      },
    }),
    buildAllowEmptyInterfaceConfig(['src/I18nDictionary.ts']),
    buildSolidHtmlForCompatConfig(['src/**/*.tsx']),
  ],
});
```

`buildSolidHtmlForCompatConfig` disables `solid/no-react-specific-props` only for the supplied files. Use it only where the library intentionally exposes an `htmlFor` prop; TypeScript should still reject unsupported JSX props.

```js
// eslint.config.mjs (Node)
import { createNodeEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createNodeEslintConfig({ tsconfigRootDir: import.meta.dirname });
```

### Prettier

```json
{ "prettier": "@jankrajewskiit/configs/prettier" }
```

To layer overrides, spread the preset in `prettier.config.mjs`; `.prettierrc.json` cannot import another preset.

```js
import preset from '@jankrajewskiit/configs/prettier' with { type: 'json' };

export default { ...preset, printWidth: 100 };
```

### Stylelint

Install the runtime and the base config it extends:

```sh
npm install --save-dev stylelint stylelint-config-standard
```

```json
{ "stylelint": { "extends": "@jankrajewskiit/configs/stylelint" } }
```

### TypeScript

```json
{ "extends": "@jankrajewskiit/configs/tsconfig/app-vite" }
```

Consumers install the ambient type providers their chosen config names (`vite`, `@types/node`, `vitest`, `@testing-library/jest-dom`). `tsconfig/lib` writes declarations to `dist` with maps disabled by default. Enable maps only when their referenced sources are published. Libraries that let `vite-plugin-dts` emit declarations extend `tsconfig/app` with `declaration: false`.

### Vite

```ts
import { defineConfig, loadEnv } from 'vite';
import { createSolidAppViteConfig } from '@jankrajewskiit/configs/vite';

export default defineConfig(({ mode }) =>
  createSolidAppViteConfig({}, { port: 3000, apiProxy: { enabled: true, env: loadEnv(mode, process.cwd(), '') } }),
);
```

```ts
import { defineConfig } from 'vite';
import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';

export default defineConfig(async () =>
  createSolidLibViteConfig({}, { fileName: 'index', externalizeFromPackageJson: true }),
);
```

Both factories take the user Vite config first and the options second; the user config is merged last. The dev proxy verifies TLS unless `apiProxy.secure` is `false`. ESM output uses `.mjs`/`.d.mts`; CJS output uses `.cjs`/`.d.cts`, including preserved modules.

### lint-staged

```js
// lint-staged.config.mjs
import { createChunkedLintStagedConfig } from '@jankrajewskiit/configs/lint-staged';

export default createChunkedLintStagedConfig();
```

`createChunkedLintStagedConfig` enables chunking with a shared default of 25 files. `chunkSize` can override that limit; `maxCommandLength` defaults to 7000 when chunking is enabled, below the Windows command-line limit. Paths are relative to the consumer and quoted. `ignorePaths` accepts non-global, non-sticky regular expressions against those relative paths. Set any target to `false` to omit its task; CSS-free libraries use `stylelintTarget: false`. Calling the factory without these options preserves the original command-array configuration.

### Husky

`.husky/pre-commit`:

```sh
hook_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$hook_dir/../node_modules/@jankrajewskiit/configs/husky/pre-commit.sh"
```

Set `project_root` before sourcing the hook when the package root differs from the default parent of `.husky`. The hook adds that package's local binaries to `PATH`, preserves stash and partial-staging protection, and never selects a global lint-staged executable.

The hook uses the project-local `lint-staged`, then falls back to `npx --no-install`. Staged files are stashed during the run so unstaged changes are never committed.

### Nginx

```dockerfile
COPY node_modules/@jankrajewskiit/configs/nginx/spa.conf /etc/nginx/conf.d/default.conf
```

The server listens on port 3000. Content-hashed files under `/assets/` are cached immutably, `index.html` is never cached, and the default Content Security Policy keeps everything on `self`; extend `connect-src` and `style-src` when the app needs other origins or inline styles.

## Reusable workflows

Consumer packages call the shared verify and publish pipeline instead of copying it. Both workflows read the Node version from the consumer's `.nvmrc`. Verification accepts `NPM_READ_TOKEN`, with `GHCR_TOKEN` as a legacy fallback. Verify also accepts `working-directory` and `node-version-file` inputs for applications in repository subdirectories, plus `verify-env` as a JSON object of non-secret build settings. It installs with lifecycle scripts disabled and runs the consumer's aggregate `verify` script.

```yaml
# .github/workflows/ci.yml
jobs:
  verify:
    uses: JanKrajewskiIT/velvetconfigs/.github/workflows/verify-package.yml@9d7851722b143c4d8aaf7ca0f2058f5ae149fe44 # v3.5.3
    with:
      package-artifact: velvet-package
    secrets:
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
```

```yaml
# .github/workflows/publish.yml
jobs:
  verify:
    uses: JanKrajewskiIT/velvetconfigs/.github/workflows/verify-package.yml@9d7851722b143c4d8aaf7ca0f2058f5ae149fe44 # v3.5.3
    secrets:
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
  publish:
    needs: verify
    uses: JanKrajewskiIT/velvetconfigs/.github/workflows/publish-package.yml@9d7851722b143c4d8aaf7ca0f2058f5ae149fe44 # v3.5.3
    permissions:
      contents: read
      packages: write
      id-token: write
    secrets:
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
```

The repository must allow access from other repositories under Settings, Actions, General.

## Release

1. Confirm `main` is green.
2. `npm version patch|minor|major` (or `npm version prerelease --preid <channel>`).
3. `git push --follow-tags`.

The `v*` tag starts `publish.yml`: verify and pack once, check the archive identity and release version, then publish the verified archive (with `--tag <channel>` for prereleases). A failed step never falls back to an unsigned publish.

## Upgrading

Release notes for the current major (3.x) are listed under [GitHub Releases](https://github.com/JanKrajewskiIT/velvetconfigs/releases). No previous major is actively supported; consumers that cannot migrate must pin the last suitable release explicitly.

Deprecated exports stay functional for at least one minor cycle and name their replacement in declarations and release notes before removal in a major release.

## Maintenance

Dependabot updates npm, GitHub Actions and Docker dependencies weekly. Maintainers also run a quarterly full dependency refresh, regenerate the lockfile from scratch, and record crossed majors, overrides, and audit suppressions in the pull request. Refresh pull requests are never auto-merged and produce a major release when peer minimums change.

## Branch protection

Protect the default branch with:

- a required, passing `verify` status check;
- at least one approving CODEOWNERS review;
- a branch that is up to date before merging;
- force pushes and non-administrative direct pushes disabled.

## Ecosystem configuration (3.5)

Use Node 26 from both version files and the exact npm version in packageManager. The shared toolchain command checks both; CI selects npm before installing. Browser library manifests do not impose the development Node version on downstream consumers.

Open frontend.code-workspace for the shared editor setup. It enables the TypeScript 7 extension against node_modules/@typescript/native and uses Prettier for formatting, ESLint for code actions, and Stylelint for CSS. npm run editor:sync regenerates this owned file; npm run editor:check detects drift. Agent-managed .vscode/settings.json is left intact.

The generated frontend.code-workspace is strict JSON. The shared Prettier preset selects its JSON parser for this filename, keeping formatter output readable by editor:check. Keep comments and trailing commas out of this generated file; put custom editor settings in the project-owned configuration.

Lint scripts and staged tasks enforce zero warnings. CI runs npm run audit:deps separately from the offline verification gate. High and critical advisories block it unless they match the shared security/audit-policy.json exception exactly. The existing braces exception expires on 2026-11-12; it must be removed or explicitly reviewed by then. Audit or registry failures also block verification.

### Libraries and configuration types

Vite libraries emit explicit ESM .mjs and .d.mts files, with declaration specifiers rewritten by vite-plugin-dts 5 using outDirs.moduleFormat. CJS uses .cjs and .d.cts when explicitly selected. Pass formats through the factory options, not build.lib.formats, so declarations and generated Rollup outputs remain aligned. The factory does not bundle declarations by default; bundleTypes requires an explicitly owned API Extractor peer. Legacy rollupTypes and outDir options fail with a migration message.

The declarations preset checks every emitted declaration with NodeNext and skipLibCheck disabled. Root Vite configurations are also type-checked, and Configs checks its own public .d.mts files. Source projects can retain skipLibCheck for build performance; it does not replace the published-declaration gate. Maps are disabled by default; publish their referenced sources before opting in.

readPackageDependencies reads both dependencies and peers and reports missing or malformed manifests. readPeerDependencies remains a deprecated alias. Dependency and peer externalization is enabled by default. Set externalizeFromPackageJson to false to bundle dependencies selectively. externalPackages selects only named packages, including their resolved node_modules paths; it no longer externalizes every dependency regardless of that option.

### Applications and deployment

Application spa.config.ts owns its CSP capabilities and public-asset probe. createSpaNginxConfig defaults to same-origin resources, rejects arbitrary directive strings and permits only validated origins. Inline styles are enabled explicitly for Solid dynamic styles and Recron's print document. Demo separately enables local blob audio/video and their decoder fetches. Recron derives API and issuer origins from its public build environment and permits same-origin framing for OIDC callbacks and printing. Traefik retains DENY for the API/docs and does not overwrite the frontend framing policy.

validateEnv checks required values, HTTP URL schemes and credential-free URLs without queries/fragments. Recron requires HTTPS for production except explicitly allowed loopback HTTP used by local Aspire builds. API URL, issuer and client ID are required. App origin is taken from the browser; VITE_AUTH_URL is no longer needed.

configs-spa runs after the Vite build and creates .deployment/spa: the exact dist output, generated Nginx policy, shared gzip/cache/routing snippet, pinned runtime Dockerfile and HTTP verification command. HTML is revalidated, hashed assets get one immutable Cache-Control header, and unhashed public files get no-cache.

CI uploads this runtime context, builds one image, checks nginx -t and HTTP routing/cache/CSP headers, and transfers that verified image to the publishing job. Deployment tags and pushes it without rebuilding. Public production environment values therefore match the validated bundle. Frontend deployment checks require a valid HTTPS certificate.

The full application Dockerfiles remain available for local/Aspire builds with BuildKit credentials. They exclude all local env files and registry templates, install the declared npm version, and generate temporary registry configuration only during dependency installation. Runtime images run as nginx without an additional curl package. Base images are pinned to registry digests and covered by Dependabot.

### Release migration

1. Use the published Configs 3.5.3 workflow commit and refresh consumer lockfiles against the matching package release.
2. Refresh and publish I18n/Auth/Reactive, then Ui, then Data using their existing manifest versions.
3. Refresh Demo and Recron installations and deploy after their verification succeeds.

Consumers pin reusable workflows to commit 9d7851722b143c4d8aaf7ca0f2058f5ae149fe44 from v3.5.3; protect release tags against moving. Pin the commit obtained with git rev-parse 'v3.5.3^{}', not the annotated tag object's SHA. Relative nested workflows then resolve from that same commit. Library verification uploads velvet-package. Publishing checks archive identity against the checkout and release tag, then publishes that archive with lifecycle scripts disabled. Manual npm publish still runs prepublishOnly.

Package and SPA image transfers use named ZIP artifacts with compression disabled because their contents are already compressed. Keep archive enabled: upload-artifact v7 ignores the configured artifact name when archive is false and uses the uploaded filename instead. The download action extracts the outer ZIP; the verified .tgz or spa-image.tar.gz inside remains unchanged.

NPM_READ_TOKEN is the preferred read-only Actions registry secret. Existing GHCR_TOKEN inputs remain a compatibility fallback; registry authentication still exports that legacy environment variable for existing npm templates. Dependabot's npm registry uses its own NPM_READ_TOKEN secret. Repositories tracking private shared workflows also supply DEPENDABOT_GIT_TOKEN to Dependabot's Git registry. Container registry and SSH deployment retain their existing secrets.

The publisher creates detached Cosign bundles for the verified archive and npm SBOM. npm provenance is disabled by default for GitHub Packages; the provenance input remains an explicit opt-in for a compatible registry. Preserve the signature bundles with each release beyond the 90-day Actions artifact retention.

The JavaScript Compiler API alias uses a tilde range for the supported TypeScript 6.0 line; the TypeScript 7 compiler keeps its independent current-major range. Ui/Data peer minimums require the I18n/Ui releases containing the corrected ESM declarations.

Library JavaScript targets the shared TypeScript baseline (ES2024), and default declaration output follows `build.outDir`. Hooks change into the consumer package before evaluating staged-file tasks, including nested Recron frontends. Development and preview commands check the toolchain before loading Vite.

Application verification can enable `dockerfile-check` to run `docker build --check .` on the full local/Aspire recipe without building it. Recron narrowly skips the secret-name heuristic in that recipe because `VITE_AUTH_*` is public OIDC metadata, while actual registry authentication stays in a BuildKit secret. All other build checks remain enabled.

## Application recovery and performance

`@jankrajewskiit/configs/browser` provides `installPreloadRecovery`, `createBrowserDiagnostics` and `observeWebVitals`. Recovery catches Vite's dynamic-import load failures and delegates a reload action to the application. It checks `canReload` and a per-tab 30-second loop guard; it never reloads automatically. Keep the update prompt outside route error boundaries. Reporters receive only structured error categories or LCP/INP/CLS values, ratings, app/version and timestamp. No URL, stack, request body, token or DOM text is included. The default transport is a local `velvet:diagnostic` event, with an in-memory history capped at 30 reports. Applications may supply a reviewed `onReport` integration.

Web Vitals use the optional `web-vitals` peer (version 6). Install it in an application that enables measurement. A document has one shared set of standard collectors; disposing observation removes the application's subscription. The collectors live until document unload. The Vite app factory embeds `__VELVET_APP_VERSION__` from the consumer manifest and emits the Vite manifest by default.

`configs-bundle-report` reads the already-built `dist/.vite/manifest.json` and writes `reports/performance.json`. It reports initial JS/CSS, complete lazy-entry dependencies, additional lazy bytes excluding initial files, and raw/gzip/Brotli sizes. It neither builds nor starts an application. Optional `performance-budget.json` accepts `initial.bytes`, `initial.gzip` and `initial.brotli` limits in bytes. Establish limits from the first actual report; no arbitrary baseline is shipped. SPA preparation includes the report in the runtime-context artifact, and the verification workflow uploads a separate report.

`configs-package-styles` copies a library's owned `src/styles` tree into `dist/styles` after Vite finishes. It preserves CSS imports and assets and rejects symbolic-link roots or files. Libraries declare their partial stylesheet exports and JavaScript entry without CSS; the helper does not infer component dependencies.

## Security pipeline

Source verification includes Gitleaks, Semgrep, actionlint, zizmor and Trivy configuration scanning. npm audit blocks high/critical advisories under the shared expiring-exception policy. Verification produces a CycloneDX dependency SBOM. Weekly/manual security workflows re-check dependency databases and source history without building the application.

Knip is available through `npm run deps:check` (JSON report) and `npm run deps:strict` (blocking unused-code check). CI records the report while the initial findings are reviewed; security scans remain blocking. Public library entry exports are preserved.

Configure `CONFIGS_READ_TOKEN` for private Configs source access alongside the existing npm read token. See [shared security controls](https://github.com/JanKrajewskiIT/velvetconfigs/blob/v3.5.0/security/README.md) for required GitHub settings, reports, image signing, staging variables, WAF activation and manual acceptance checks.

## Code quality

See [shared quality controls](quality/README.md) for architecture, duplication, strict unused-code checks, Promise handling and CodeQL rollout.
