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

Tool runtimes are optional peers. Install only the ones you run: `eslint` (`^10.0.0`), `prettier` (`^3.0.0`), `stylelint` (`^17.0.0`), `stylelint-config-standard` (`^40.0.0`), `typescript` (`^6.0.0`), `vite` (`^8.0.0`), and `lint-staged` (`^17.0.0`). Preset plugins are regular dependencies. `eslint-plugin-jsx-a11y` still declares ESLint 9 as its newest peer, so `npm install` prints an `ERESOLVE overriding peer dependency` warning with ESLint 10; the install succeeds.

Releases are published with npm provenance. Verify an installed version with:

```sh
npm audit signatures @jankrajewskiit/configs
```

## Subpath exports

| Subpath                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `./eslint`             | ESLint flat-config factories and selector builders |
| `./prettier`           | Prettier preset                                    |
| `./stylelint`          | Stylelint preset                                   |
| `./tsconfig/app`       | Browser app TypeScript baseline                    |
| `./tsconfig/node`      | Node TypeScript baseline                           |
| `./tsconfig/app-vite`  | App baseline plus Vite client types                |
| `./tsconfig/node-vite` | Node baseline plus Node types                      |
| `./tsconfig/lib`       | Library baseline emitting declarations             |
| `./tsconfig/test`      | App baseline plus Vitest and Testing Library types |
| `./vite`               | Vite config factories for Solid apps and libraries |
| `./lint-staged`        | lint-staged factory and default config             |
| `./husky/pre-commit`   | Husky pre-commit snippet to source                 |
| `./nginx/spa`          | Nginx SPA server block                             |

## Usage

### ESLint

`tsconfigRootDir` is required; both factories throw without it. `environments` accepts `browser`, `node`, `worker`, `serviceworker`, `jest`, and `vitest` and merges their globals (default `['browser']`). Files outside `typedFiles` receive no type-aware rules, so list every directory with TypeScript sources there.

```js
// eslint.config.mjs
import {
  buildLiteralI18nKeySelectors,
  buildNoChildrenPropSelectors,
  createEslintConfig,
} from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser', 'vitest'],
  extraConfigs: [
    {
      files: ['src/**/*.tsx'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...buildNoChildrenPropSelectors([{ component: 'Button', prop: 'label', forbid: ['children', 'title'] }]),
          ...buildLiteralI18nKeySelectors(),
        ],
      },
    },
  ],
});
```

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

Consumers install the ambient type providers their chosen config names (`vite`, `@types/node`, `vitest`, `@testing-library/jest-dom`). `tsconfig/lib` writes declarations and declaration maps to `dist`; ship `src` or disable `declarationMap` so published maps resolve. Libraries that let `vite-plugin-dts` emit declarations extend `tsconfig/app` with `declaration: false`.

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

Both factories take the user Vite config first and the options second; the user config is merged last. The dev proxy verifies TLS unless `apiProxy.secure` is `false`. With several `formats` and `preserveModules`, output names carry the format (`Button.es.js`).

### lint-staged

```js
// lint-staged.config.mjs
export { default } from '@jankrajewskiit/configs/lint-staged';
```

### Husky

`.husky/pre-commit`:

```sh
hook_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$hook_dir/../node_modules/@jankrajewskiit/configs/husky/pre-commit.sh"
```

The hook prefers the project-local `lint-staged`, falls back to one on `PATH`, then to `npx --no-install`. Staged files are stashed during the run so unstaged changes are never committed.

### Nginx

```dockerfile
COPY node_modules/@jankrajewskiit/configs/nginx/spa.conf /etc/nginx/conf.d/default.conf
```

The server listens on port 3000. Content-hashed files under `/assets/` are cached immutably, `index.html` is never cached, and the default Content Security Policy keeps everything on `self`; extend `connect-src` and `style-src` when the app needs other origins or inline styles.

## Reusable workflows

Consumer packages call the shared verify and publish pipeline instead of copying it. Both workflows read the Node version from the consumer's `.nvmrc` and take an optional `GHCR_TOKEN` secret.

```yaml
# .github/workflows/ci.yml
jobs:
  verify:
    uses: jankrajewskiit/velvetconfigs/.github/workflows/verify-package.yml@main
    secrets:
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
```

```yaml
# .github/workflows/publish.yml
jobs:
  verify:
    uses: jankrajewskiit/velvetconfigs/.github/workflows/verify-package.yml@main
    secrets:
      GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}
  publish:
    needs: verify
    uses: jankrajewskiit/velvetconfigs/.github/workflows/publish-package.yml@main
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

The `v*` tag starts `publish.yml`: verify, version check, then `npm publish --provenance` (with `--tag <channel>` for prereleases). A failed step never falls back to an unsigned publish.

## Upgrading

Release notes for the current major (3.x) are listed under [GitHub Releases](https://github.com/JanKrajewskiIT/velvetconfigs/releases). No previous major is actively supported; consumers that cannot migrate must pin the last suitable release explicitly.

Deprecated exports stay functional for at least one minor cycle and name their replacement in declarations and release notes before removal in a major release.

## Maintenance

Dependabot updates npm and GitHub Actions dependencies weekly. Maintainers also run a quarterly full dependency refresh, regenerate the lockfile from scratch, and record crossed majors, overrides, and audit suppressions in the pull request. Refresh pull requests are never auto-merged and produce a major release when peer minimums change.

## Branch protection

Protect the default branch with:

- a required, passing `verify` status check;
- at least one approving CODEOWNERS review;
- a branch that is up to date before merging;
- force pushes and non-administrative direct pushes disabled.
