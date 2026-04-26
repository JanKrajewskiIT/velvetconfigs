# @jankrajewskiit/configs

Shared tooling configuration extracted from [VelvetUi](https://github.com/JanKrajewskiIT/velvet). Provides reusable presets for ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged, Husky and Nginx.

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

Install the relevant peer dependencies on demand (eslint, prettier, stylelint, typescript, vite, lint-staged) — only the ones you actually use.

## Subpath exports

| Export                                       | Purpose                                               |
| -------------------------------------------- | ----------------------------------------------------- |
| `@jankrajewskiit/configs/eslint`             | Flat-config factory for SolidJS + TypeScript projects |
| `@jankrajewskiit/configs/prettier`           | Prettier preset (JSON)                                |
| `@jankrajewskiit/configs/stylelint`          | Stylelint preset (JSON)                               |
| `@jankrajewskiit/configs/tsconfig/app`       | TS config for browser app code                        |
| `@jankrajewskiit/configs/tsconfig/node`      | TS config for node-side code                          |
| `@jankrajewskiit/configs/tsconfig/app-vite`  | `app` + `vite/client` types                           |
| `@jankrajewskiit/configs/tsconfig/node-vite` | `node` + `node` types                                 |
| `@jankrajewskiit/configs/vite`               | `createSolidAppViteConfig` factory                    |
| `@jankrajewskiit/configs/lint-staged`        | `createLintStagedConfig` factory + default            |
| `@jankrajewskiit/configs/husky/pre-commit`   | Pre-commit hook script                                |
| `@jankrajewskiit/configs/nginx/spa`          | Nginx SPA config                                      |

## Usage examples

### ESLint (`eslint.config.mjs`)

```js
import { createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  ignorePaths: ['dist'],
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

### Vite (`vite.config.ts`)

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
