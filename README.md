# @jankrajewskiit/configs

Shared tooling configuration for SolidJS apps and libraries. It provides reusable presets for ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged, Husky, and Nginx.

## Install

The package is published to **GitHub Packages**. Add this to a project-level `.npmrc`:

```
@jankrajewskiit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GHCR_TOKEN}
```

Then:

```bash
npm install --save-dev @jankrajewskiit/configs
```

Install only the peer dependencies you use (`eslint`, `prettier`, `stylelint`, `typescript`, `vite`, `lint-staged`).

## Subpath exports

| Export                                       | Purpose                                                                                                                                                                                                                     |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@jankrajewskiit/configs/eslint`             | `createEslintConfig` (Solid/browser), `createNodeEslintConfig` (Node), plus `buildNoChildrenPropSelectors` and `buildLiteralI18nKeySelectors` helpers                                                                       |
| `@jankrajewskiit/configs/prettier`           | Prettier preset (JSON)                                                                                                                                                                                                      |
| `@jankrajewskiit/configs/stylelint`          | Stylelint preset (JSON)                                                                                                                                                                                                     |
| `@jankrajewskiit/configs/tsconfig/app`       | TS config for browser app code                                                                                                                                                                                              |
| `@jankrajewskiit/configs/tsconfig/node`      | TS config for node-side code                                                                                                                                                                                                |
| `@jankrajewskiit/configs/tsconfig/app-vite`  | `app` + `vite/client` types                                                                                                                                                                                                 |
| `@jankrajewskiit/configs/tsconfig/node-vite` | `node` + `node` types                                                                                                                                                                                                       |
| `@jankrajewskiit/configs/tsconfig/lib`       | `app` + declaration emit. Use when **`tsc` emits `.d.ts`** (e.g. `tsc -b && vite build` with no `vite-plugin-dts`). If `vite-plugin-dts` already emits types for you, use `tsconfig/app` with `declaration: false` instead. |
| `@jankrajewskiit/configs/tsconfig/test`      | `app` + Vitest / Testing Library types                                                                                                                                                                                      |
| `@jankrajewskiit/configs/vite`               | `createSolidAppViteConfig` (apps) and `createSolidLibViteConfig` (libraries)                                                                                                                                                |
| `@jankrajewskiit/configs/lint-staged`        | `createLintStagedConfig` factory + default                                                                                                                                                                                  |
| `@jankrajewskiit/configs/husky/pre-commit`   | Pre-commit hook script                                                                                                                                                                                                      |
| `@jankrajewskiit/configs/nginx/spa`          | Nginx SPA config                                                                                                                                                                                                            |

## Usage examples

### ESLint (`eslint.config.mjs`)

For Solid/browser apps:

```js
import { createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  ignorePaths: ['storybook-static'],
  environments: ['browser'], // 'node' | 'worker' | 'serviceworker' | 'jest' | 'vitest'
});
```

For Node-side projects (CLI, scripts, server) - same baseline minus Solid, `jsx-a11y`, and `css-modules`:

```js
import { createNodeEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createNodeEslintConfig({
  tsconfigRootDir: import.meta.dirname,
});
```

Add project-specific selectors via `extraConfigs`:

```js
import {
  buildLiteralI18nKeySelectors,
  buildNoChildrenPropSelectors,
  createEslintConfig,
} from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  extraConfigs: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-syntax': [
          'error',
          ...buildNoChildrenPropSelectors([
            { component: 'DialogTitle', prop: 'label' },
            { component: 'IconButton', prop: 'label', forbid: 'title' },
          ]),
          ...buildLiteralI18nKeySelectors(),
        ],
      },
    },
  ],
});
```

### Prettier (`package.json`)

```json
{ "prettier": "@jankrajewskiit/configs/prettier" }
```

### Stylelint (`package.json`)

```json
{ "stylelint": { "extends": "@jankrajewskiit/configs/stylelint" } }
```

### TypeScript (`tsconfig.json`)

```json
{ "extends": "@jankrajewskiit/configs/tsconfig/app-vite" }
```

### Vite — application (`vite.config.ts`)

```ts
import { defineConfig, loadEnv } from 'vite';
import { createSolidAppViteConfig } from '@jankrajewskiit/configs/vite';

export default defineConfig(({ mode }) =>
  createSolidAppViteConfig(
    {},
    {
      port: 3000,
      apiProxy: { enabled: true, env: loadEnv(mode, process.cwd(), '') },
    },
  ),
);
```

### Vite — library (`vite.config.ts`)

```ts
import { defineConfig } from 'vite';
import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';

export default defineConfig(async () =>
  createSolidLibViteConfig(
    {},
    {
      fileName: 'my-lib',
      // Either list packages explicitly...
      externalPackages: ['solid-js', '@solidjs/router', 'solid-icons'],
      // ...or auto-externalize everything from peerDependencies + dependencies:
      externalizeFromPackageJson: true,
    },
  ),
);
```

Defaults: `entry: 'src/index.ts'`, ESM-only output, `preserveModules: true`, single CSS bundle, `target: 'esnext'`, `vite-plugin-dts` enabled.

### lint-staged (`lint-staged.config.mjs`)

```js
export { default } from '@jankrajewskiit/configs/lint-staged';
```

### Husky pre-commit (`.husky/pre-commit`)

```sh
hook_dir="$(dirname "$0")"
. "$hook_dir/../node_modules/@jankrajewskiit/configs/husky/pre-commit.sh"
```

## License

MIT

## Releasing

Publication is automated via GitHub Actions:

1. Bump the version: `npm version patch | minor | major` (creates commit + tag `vX.Y.Z`).
2. Push commit and tag: `git push && git push --tags`.
3. The `Publish` workflow runs `verify` on Node 22 and 25, checks the tag matches `package.json` version, and publishes to GitHub Packages.

The `verify` workflow also runs on every push and PR to `main`.
