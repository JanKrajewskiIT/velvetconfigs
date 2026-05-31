# @jankrajewskiit/configs

Shared tooling presets for SolidJS apps and libraries. One install, one version, the same baseline everywhere.

Covers: ESLint (flat-config, type-aware), Prettier, Stylelint (CSS Modules), TypeScript base configs, Vite app/library factories, lint-staged, Husky pre-commit, Nginx SPA server block.

## Install

```bash
npm install --save-dev @jankrajewskiit/configs
```

The package is published to GitHub Packages. Consumers add an `.npmrc` next to their `package.json`:

```ini
@jankrajewskiit:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` must have `read:packages` scope.

Optional tools (install only what you run):

```bash
npm install --save-dev eslint typescript-eslint prettier stylelint vite vite-plugin-solid vite-plugin-dts lint-staged
```

## Subpath exports

| Subpath                                      | Purpose                                          |
| -------------------------------------------- | ------------------------------------------------ |
| `@jankrajewskiit/configs/eslint`             | ESLint flat-config factories + selector builders |
| `@jankrajewskiit/configs/prettier`           | Prettier JSON preset                             |
| `@jankrajewskiit/configs/stylelint`          | Stylelint JSON preset                            |
| `@jankrajewskiit/configs/tsconfig/app`       | Browser baseline                                 |
| `@jankrajewskiit/configs/tsconfig/node`      | Node baseline                                    |
| `@jankrajewskiit/configs/tsconfig/app-vite`  | App baseline + `vite/client` types               |
| `@jankrajewskiit/configs/tsconfig/node-vite` | Node baseline + `node` types                     |
| `@jankrajewskiit/configs/tsconfig/lib`       | Library declaration emit                         |
| `@jankrajewskiit/configs/tsconfig/test`      | Test profile (Vitest + Testing Library)          |
| `@jankrajewskiit/configs/vite`               | App + library Vite factories                     |
| `@jankrajewskiit/configs/lint-staged`        | lint-staged factory + default                    |
| `@jankrajewskiit/configs/husky/pre-commit`   | Husky pre-commit shell helper                    |
| `@jankrajewskiit/configs/nginx/spa`          | Nginx SPA server block                           |

## ESLint

```js
import { createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser', 'vitest'],
});
```

Node-side projects use `createNodeEslintConfig`. `tsconfigRootDir` is required for both factories.

Extending with selector-based rules:

```js
import { createEslintConfig, buildNoChildrenPropRule } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  extraConfigs: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-syntax': buildNoChildrenPropRule([
          { component: 'Button', prop: 'label', forbid: ['children', 'title'] },
        ]),
      },
    },
  ],
});
```

Supported environment tokens: `browser`, `node`, `worker`, `serviceworker`, `jest`, `vitest`.

## Prettier

Point the consumer's `package.json`:

```json
{ "prettier": "@jankrajewskiit/configs/prettier" }
```

Or extend in a local `.prettierrc.json`.

## Stylelint

```json
{ "stylelint": { "extends": "@jankrajewskiit/configs/stylelint" } }
```

## TypeScript

```json
{ "extends": "@jankrajewskiit/configs/tsconfig/app-vite" }
```

A library that delegates declarations to `vite-plugin-dts` extends `tsconfig/app` with `declaration: false`. A library that emits declarations via `tsc` extends `tsconfig/lib`.

## Vite — application

```ts
import { defineConfig, loadEnv } from 'vite';
import { createSolidAppViteConfig } from '@jankrajewskiit/configs/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return createSolidAppViteConfig(
    {},
    {
      port: 5173,
      apiProxy: { enabled: true, env },
    },
  );
});
```

## Vite — library

```ts
import { defineConfig } from 'vite';
import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';

export default defineConfig(async () =>
  createSolidLibViteConfig(
    {},
    {
      fileName: 'index',
      externalizeFromPackageJson: true,
    },
  ),
);
```

`fileName` is required. The library factory is async; wrap it in an async thunk.

## lint-staged

```js
export { default } from '@jankrajewskiit/configs/lint-staged';
```

Custom globs:

```js
import { createLintStagedConfig } from '@jankrajewskiit/configs/lint-staged';

export default createLintStagedConfig({
  prettierTarget: '*.{json,md,yml,yaml,html,graphql}',
});
```

## Husky

Create `.husky/pre-commit`:

```sh
hook_dir="$(cd "$(dirname "$0")" && pwd)"
. "$hook_dir/../node_modules/@jankrajewskiit/configs/husky/pre-commit.sh"
```

Enable Husky once with `npm install` (the `prepare` script wires hooks).

## Nginx

In your Dockerfile:

```dockerfile
COPY --from=builder /app/dist /usr/share/nginx/html
COPY node_modules/@jankrajewskiit/configs/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
```

Override the `Content-Security-Policy` for any external API origin the SPA actually calls.

## Releasing

1. `main` must be green on the verify workflow.
2. `npm version patch | minor | major` (creates a commit and a `vX.Y.Z` tag).
3. `git push --follow-tags`.
4. The publish workflow runs verify → check-version → publish.

## Upgrading

See the GitHub Releases page for migration notes. Breaking changes are reserved for MAJOR releases and documented inline with their entries.
