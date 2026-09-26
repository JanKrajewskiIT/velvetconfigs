# @jankrajewskiit/configs

Shared ESLint, Prettier, Stylelint, TypeScript, Vite, lint-staged, Husky, and Nginx presets for SolidJS applications and libraries.

## Installation

Configure GitHub Packages for the package scope:

```ini
@jankrajewskiit:registry=https://npm.pkg.github.com
```

When the package requires authentication, also configure a token with `read:packages` access without committing its value:

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Install the package and the tool runtimes used by your project:

```sh
npm install --save-dev @jankrajewskiit/configs eslint prettier stylelint typescript vite lint-staged
```

All tool runtimes are optional peers. Install only the runtimes your repository invokes. Preset-owned plugins are installed with this package.

Published packages include npm provenance. Verify an installation with:

```sh
npm audit signatures @jankrajewskiit/configs
```

## Exports

| Export                                       | Purpose                                             |
| -------------------------------------------- | --------------------------------------------------- |
| `@jankrajewskiit/configs/eslint`             | Browser/Solid and Node ESLint flat-config factories |
| `@jankrajewskiit/configs/prettier`           | Shared Prettier options                             |
| `@jankrajewskiit/configs/stylelint`          | Shared Stylelint rules                              |
| `@jankrajewskiit/configs/tsconfig/app`       | Browser TypeScript baseline                         |
| `@jankrajewskiit/configs/tsconfig/app-vite`  | Browser baseline with Vite client types             |
| `@jankrajewskiit/configs/tsconfig/node`      | Node TypeScript baseline                            |
| `@jankrajewskiit/configs/tsconfig/node-vite` | Node baseline with Node ambient types               |
| `@jankrajewskiit/configs/tsconfig/lib`       | Library declaration-emission profile                |
| `@jankrajewskiit/configs/tsconfig/test`      | Vitest and Testing Library profile                  |
| `@jankrajewskiit/configs/vite`               | Solid application and library Vite factories        |
| `@jankrajewskiit/configs/lint-staged`        | lint-staged factory and default config              |
| `@jankrajewskiit/configs/husky/pre-commit`   | Reusable pre-commit shell helper                    |
| `@jankrajewskiit/configs/nginx/spa`          | Nginx SPA server block                              |

## ESLint

The browser factory requires `tsconfigRootDir`. Supported environments are `browser`, `node`, `worker`, `serviceworker`, `jest`, and `vitest`.

```js
// eslint.config.mjs
import { buildNoChildrenPropRule, createEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  environments: ['browser', 'vitest'],
  extraConfigs: [
    {
      rules: {
        'no-restricted-syntax': buildNoChildrenPropRule([
          { component: 'Dialog', prop: 'heading', forbid: ['children', 'title'] },
        ]),
      },
    },
  ],
});
```

Node projects use the Node-only factory:

```js
// eslint.config.mjs
import { createNodeEslintConfig } from '@jankrajewskiit/configs/eslint';

export default createNodeEslintConfig({
  tsconfigRootDir: import.meta.dirname,
});
```

`buildLiteralI18nKeyRule()` is also available for projects that separate dynamic `t(variable)` calls from static `ts('known.key')` calls.

## Prettier

Projects without overrides can reference the preset from `package.json`:

```json
{
  "prettier": "@jankrajewskiit/configs/prettier"
}
```

Use an ESM config when adding local overrides:

```js
// prettier.config.mjs
import preset from '@jankrajewskiit/configs/prettier' with { type: 'json' };

export default {
  ...preset,
  printWidth: 100,
};
```

## Stylelint

```json
{
  "stylelint": {
    "extends": "@jankrajewskiit/configs/stylelint"
  }
}
```

## TypeScript

Choose the profile matching the consumer:

```json
{
  "extends": "@jankrajewskiit/configs/tsconfig/app-vite",
  "include": ["src"]
}
```

Libraries using `tsc` for declarations extend `tsconfig/lib`. Libraries using the default Vite declaration plugin extend `tsconfig/app` and keep TypeScript declaration emission disabled. Test projects extend `tsconfig/test`; Node tooling uses `tsconfig/node` or `tsconfig/node-vite`.

## Vite Applications

```ts
// vite.config.ts
import { createSolidAppViteConfig } from '@jankrajewskiit/configs/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) =>
  createSolidAppViteConfig(
    {},
    {
      port: 3000,
      apiProxy: {
        enabled: true,
        env: loadEnv(mode, process.cwd(), ''),
      },
    },
  ),
);
```

The `~` alias points to `src` by default. Set `alias: null` to disable it. User configuration is merged last.

## Vite Libraries

```ts
// vite.config.ts
import { createSolidLibViteConfig } from '@jankrajewskiit/configs/vite';
import { defineConfig } from 'vite';

export default defineConfig(async () =>
  createSolidLibViteConfig(undefined, {
    fileName: 'index',
    externalizeFromPackageJson: true,
  }),
);
```

Library output is ESM-only by default, preserves modules under `src`, and emits declarations through `vite-plugin-dts`. Pass `dts: false` when declarations are emitted separately with `tsc -b` and `tsconfig/lib`.

## lint-staged

Re-export the default config:

```js
// lint-staged.config.mjs
export { default } from '@jankrajewskiit/configs/lint-staged';
```

Custom globs are available through `createLintStagedConfig`.

## Husky

Create `.husky/pre-commit` in the consumer repository:

```sh
hook_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
. "$hook_dir/../node_modules/@jankrajewskiit/configs/husky/pre-commit.sh"
```

Run Husky's installer once, normally through the consumer's `prepare` script. The helper runs lint-staged sequentially with `--no-stash` from the repository root.

## Nginx

Copy the shipped server block into an Nginx image:

```dockerfile
COPY --from=build /app/node_modules/@jankrajewskiit/configs/nginx/spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```

The server listens on port 3000, provides SPA fallback routing, disables caching for `index.html`, and caches immutable assets for one year. Deploy it behind TLS termination and adjust the CSP `connect-src` directive when APIs use another origin.

## Releases

The package follows semantic versioning. Breaking export, peer minimum, Node minimum, rule-severity, layer-order, and default-option changes require a major release. New exports and options with safe defaults require a minor release; compatible fixes use a patch release.

Release from a green `main` branch:

1. Run `npm version patch`, `npm version minor`, or `npm version major`.
2. Push the version commit and tag with `git push --follow-tags`.
3. The tag-triggered workflow verifies the package, checks the tag against `package.json`, and publishes it with provenance.

Prereleases use `npm version prerelease --preid <channel>` and publish under the matching npm dist-tag. Every release must have GitHub release notes listing breaking changes, new exports, new options, and notable internal changes in that order.

## Upgrading

The current supported line is major version 2. Review the [GitHub Releases](https://github.com/jankrajewskiit/configs/releases) before upgrading across majors. This clean-room baseline does not define an actively supported previous-major line; consumers that cannot migrate must pin the last suitable release explicitly.

Deprecated exports remain functional for at least one minor cycle and identify their replacement in both declarations and release notes before removal in a major release.

## Maintenance

Dependabot updates npm and GitHub Actions dependencies weekly. In addition, maintainers perform a quarterly full dependency refresh with `npm-check-updates`, regenerate the lockfile from scratch, document crossed majors and overrides in the pull request, and run the complete verify, dry-run publish, audit, and CI checks. Full refresh pull requests require human review and produce a major release when peer minimums change.
