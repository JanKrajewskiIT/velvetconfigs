import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mergeConfig } from 'vite';
import solid from 'vite-plugin-solid';

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

  let rewrite;
  if (typeof apiProxy.rewrite === 'function') {
    rewrite = apiProxy.rewrite;
  } else if (apiProxy.rewrite === false) {
    rewrite = undefined;
  } else {
    rewrite = (requestPath) => requestPath.replace(new RegExp(`^${proxyPath}`, 'u'), '');
  }

  return {
    [proxyPath]: {
      target,
      changeOrigin: apiProxy.changeOrigin ?? true,
      secure: apiProxy.secure ?? false,
      rewrite,
    },
  };
}

function resolveLinkedWorkspaceConfig(linkedWorkspace) {
  if (!linkedWorkspace?.enabled) {
    return undefined;
  }

  const { workspacePath, packageName } = linkedWorkspace;
  if (!workspacePath) {
    throw new Error('linkedWorkspace.enabled requires `workspacePath`.');
  }
  if (!packageName) {
    throw new Error('linkedWorkspace.enabled requires `packageName` (e.g. "@scope/ui").');
  }

  const workspaceNodeModules = resolve(workspacePath, 'node_modules');
  const localNodeModules = resolve('./node_modules');

  // Optional file-level aliases for ESM/CJS edge-cases:
  // [{ from: 'pkg/path.js' }, ...]
  const fileAliases = linkedWorkspace.fileAliases ?? [];
  const alias = {};
  for (const entry of fileAliases) {
    const rel = typeof entry === 'string' ? entry : entry.from;
    const localPath = entry.local ?? `${localNodeModules}/${rel}`;
    alias[`${workspaceNodeModules}/${rel}`] = resolve(localPath);
  }

  return {
    server: {
      fs: {
        allow: [resolve('.'), resolve(workspacePath)],
      },
    },
    resolve: {
      alias,
      dedupe: linkedWorkspace.dedupe ?? [],
    },
    optimizeDeps: {
      exclude: linkedWorkspace.optimizeDepsExclude ?? [packageName],
      include: linkedWorkspace.optimizeDepsInclude ?? [],
    },
  };
}

export function createSolidAppViteConfig(
  userConfig = {},
  {
    alias = '~',
    srcDir = 'src',
    port = undefined,
    host = undefined,
    solidPluginOptions = undefined,
    apiProxy = undefined,
    linkedWorkspace = undefined,
  } = {},
) {
  const resolvedApiProxy = resolveApiProxyOptions(apiProxy);
  const resolvedLinkedWorkspace = resolveLinkedWorkspaceConfig(linkedWorkspace);

  const serverConfig = {};
  if (port != null) serverConfig.port = port;
  if (host != null) serverConfig.host = host;
  if (resolvedApiProxy) serverConfig.proxy = resolvedApiProxy;

  const baseConfig = {
    plugins: [solid(solidPluginOptions)],
    resolve: alias
      ? {
          alias: {
            [alias]: resolve(process.cwd(), srcDir),
          },
        }
      : undefined,
    server: Object.keys(serverConfig).length ? serverConfig : undefined,
    preview: port != null ? { port } : undefined,
  };

  const mergedWithLinkedWorkspace = resolvedLinkedWorkspace
    ? mergeConfig(baseConfig, resolvedLinkedWorkspace)
    : baseConfig;
  const mergedWithUserConfig = mergeConfig(mergedWithLinkedWorkspace, userConfig);

  // De-duplicate after merges.
  if (mergedWithUserConfig.optimizeDeps) {
    mergedWithUserConfig.optimizeDeps = {
      ...mergedWithUserConfig.optimizeDeps,
      include: uniqueMaybe(mergedWithUserConfig.optimizeDeps.include),
      exclude: uniqueMaybe(mergedWithUserConfig.optimizeDeps.exclude),
    };
  }
  if (mergedWithUserConfig.resolve?.dedupe) {
    mergedWithUserConfig.resolve = {
      ...mergedWithUserConfig.resolve,
      dedupe: uniqueMaybe(mergedWithUserConfig.resolve.dedupe),
    };
  }

  return mergedWithUserConfig;
}

function buildExternalMatcher(externalPackages) {
  if (!externalPackages || externalPackages.length === 0) {
    return (id) => id.includes('node_modules');
  }
  const escaped = externalPackages.map((name) => name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
  const pattern = new RegExp(`^(${escaped.join('|')})(/|$)`, 'u');
  return (id) => id.includes('node_modules') || pattern.test(id);
}

/**
 * Read peerDependencies + dependencies from a package.json so library builds
 * can externalize them without having to repeat the list in vite.config.ts.
 */
export function readPeerDependencies(packageJsonPath = resolve(process.cwd(), 'package.json')) {
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return Object.keys({ ...pkg.peerDependencies, ...pkg.dependencies });
  } catch {
    return [];
  }
}

/**
 * Lazy-loads vite-plugin-dts so projects that don't need types emission
 * (or don't install the optional peer) won't crash at import time.
 */
async function loadDtsPlugin(dtsOptions) {
  if (dtsOptions === false) {
    return null;
  }
  const mod = await import('vite-plugin-dts');
  const dts = mod.default ?? mod;
  return dts({
    insertTypesEntry: true,
    ...(dtsOptions ?? {}),
  });
}

/**
 * Vite preset for Solid component libraries (lib mode).
 *
 * Defaults:
 *  - alias `~` -> srcDir
 *  - lib entry: src/index.ts, ESM only, fileName from `fileName` option
 *  - preserveModules: true (tree-shakable per-file output)
 *  - cssCodeSplit: false (single CSS bundle)
 *  - vite-plugin-dts (insertTypesEntry: true) — pass `dts: false` to disable
 *  - external: matches `node_modules` plus packages listed in `externalPackages`
 *    (use `externalizeFromPackageJson: true` to auto-include peer/regular deps)
 *  - build.target: 'esnext'
 */
export async function createSolidLibViteConfig(
  userConfig = {},
  {
    alias = '~',
    srcDir = 'src',
    entry = 'src/index.ts',
    fileName,
    formats = ['es'],
    externalPackages = [],
    externalizeFromPackageJson = false,
    preserveModules = true,
    preserveModulesRoot = 'src',
    cssCodeSplit = false,
    target = 'esnext',
    dts: dtsOptions = undefined,
    solidPluginOptions = undefined,
  } = {},
) {
  if (!fileName) {
    throw new Error('createSolidLibViteConfig: `fileName` is required (e.g. "my-lib").');
  }

  const cwd = process.cwd();
  const dtsPlugin = await loadDtsPlugin(dtsOptions);

  const mergedExternals = externalizeFromPackageJson
    ? unique([...readPeerDependencies(), ...externalPackages])
    : externalPackages;

  const baseConfig = {
    plugins: [solid(solidPluginOptions), ...(dtsPlugin ? [dtsPlugin] : [])],
    resolve: alias
      ? {
          alias: {
            [alias]: resolve(cwd, srcDir),
          },
        }
      : undefined,
    build: {
      target,
      lib: {
        entry: resolve(cwd, entry),
        fileName,
        formats,
      },
      rollupOptions: {
        external: buildExternalMatcher(mergedExternals),
        output: {
          preserveModules,
          preserveModulesRoot,
          entryFileNames: (chunkInfo) =>
            `${chunkInfo.name.replace(new RegExp(`^${preserveModulesRoot}[\\\\/]`, 'u'), '')}.js`,
        },
      },
      cssCodeSplit,
    },
  };

  return mergeConfig(baseConfig, userConfig);
}
