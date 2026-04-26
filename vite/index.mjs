import { resolve } from 'node:path';
import { mergeConfig } from 'vite';
import solid from 'vite-plugin-solid';

export const solidMarkdownOptimizeDeps = {
  exclude: ['solid-markdown'],
  include: [
    'remark-gfm',
    'solid-markdown > extend',
    'solid-markdown > style-to-object',
    'solid-markdown > inline-style-parser',
    'solid-markdown > debug',
    'solid-markdown > ms',
  ],
  extensions: ['.jsx'],
};

const linkedWorkspaceDedupe = [
  'solid-js',
  '@solidjs/router',
  'debug',
  'ms',
  'extend',
  'unified',
  'remark-parse',
  'remark-rehype',
  'vfile',
  'micromark',
  'mdast-util-from-markdown',
];

const linkedWorkspaceOptimizeDeps = {
  exclude: ['@jankrajewskiit/ui', 'oidc-client-ts'],
  include: [
    'extend',
    'unified',
    'remark-parse',
    'remark-rehype',
    'vfile',
    'micromark',
    'mdast-util-from-markdown',
    'debug',
    'ms',
  ],
};

function unique(items = []) {
  return [...new Set(items)];
}

function uniqueMaybe(items) {
  return items ? unique(items) : items;
}

function resolveApiProxyOptions(apiProxy) {
  if (!apiProxy?.enabled) {
    return undefined;
  }

  const envVar = apiProxy.envVar ?? 'VITE_API_BASE_URL';
  const envTarget = apiProxy.env?.[envVar]?.trim();
  const target = apiProxy.target?.trim() || envTarget || apiProxy.fallbackTarget || 'http://localhost:5000';
  const proxyPath = apiProxy.path ?? '/api';

  return {
    [proxyPath]: {
      target,
      changeOrigin: apiProxy.changeOrigin ?? true,
      secure: apiProxy.secure ?? false,
      rewrite:
        apiProxy.rewrite === false
          ? undefined
          : (requestPath) => requestPath.replace(new RegExp(`^${proxyPath}`, 'u'), ''),
    },
  };
}

function resolveLinkedWorkspaceConfig(linkedWorkspace) {
  if (!linkedWorkspace?.enabled) {
    return undefined;
  }

  const workspacePath = linkedWorkspace.workspacePath ?? '../../VelvetUi';

  const ciNodeModules = resolve(workspacePath, 'node_modules');

  const alias = {
    [`${ciNodeModules}/lightweight-charts/dist/lightweight-charts.production.mjs`]: resolve(
      './node_modules/lightweight-charts/dist/lightweight-charts.production.mjs',
    ),
    [`${ciNodeModules}/oidc-client-ts/dist/esm/oidc-client-ts.js`]: resolve(
      './node_modules/oidc-client-ts/dist/esm/oidc-client-ts.js',
    ),
  };

  return {
    server: {
      fs: {
        allow: [resolve('.'), resolve(workspacePath)],
      },
    },
    resolve: {
      alias,
      dedupe: linkedWorkspace.dedupe ?? linkedWorkspaceDedupe,
    },
    optimizeDeps: {
      exclude: linkedWorkspace.optimizeDepsExclude ?? linkedWorkspaceOptimizeDeps.exclude,
      include: linkedWorkspace.optimizeDepsInclude ?? linkedWorkspaceOptimizeDeps.include,
    },
  };
}

export function createSolidAppViteConfig(
  userConfig = {},
  {
    alias = '~',
    srcDir = 'src',
    port = null,
    includeSolidMarkdownDeps = true,
    solidPluginOptions = undefined,
    apiProxy = undefined,
    linkedWorkspace = undefined,
  } = {},
) {
  const resolvedApiProxy = resolveApiProxyOptions(apiProxy);
  const resolvedLinkedWorkspace = resolveLinkedWorkspaceConfig(linkedWorkspace);

  const defaultOptimizeDeps = includeSolidMarkdownDeps ? solidMarkdownOptimizeDeps : undefined;

  const baseConfig = {
    plugins: [solid(solidPluginOptions)],
    resolve: alias
      ? {
          alias: {
            [alias]: resolve(process.cwd(), srcDir),
          },
        }
      : undefined,
    optimizeDeps: defaultOptimizeDeps,
    server: {
      ...(port ? { port } : {}),
      ...(resolvedApiProxy ? { proxy: resolvedApiProxy } : {}),
    },
    preview: port ? { port } : undefined,
  };

  const mergedWithLinkedWorkspace = resolvedLinkedWorkspace
    ? mergeConfig(baseConfig, resolvedLinkedWorkspace)
    : baseConfig;
  const mergedWithUserConfig = mergeConfig(mergedWithLinkedWorkspace, userConfig);

  if (!mergedWithUserConfig.optimizeDeps) {
    return mergedWithUserConfig;
  }

  return {
    ...mergedWithUserConfig,
    optimizeDeps: {
      ...mergedWithUserConfig.optimizeDeps,
      include: uniqueMaybe(mergedWithUserConfig.optimizeDeps.include),
      exclude: uniqueMaybe(mergedWithUserConfig.optimizeDeps.exclude),
    },
    resolve: {
      ...mergedWithUserConfig.resolve,
      dedupe: uniqueMaybe(mergedWithUserConfig.resolve?.dedupe),
    },
  };
}
