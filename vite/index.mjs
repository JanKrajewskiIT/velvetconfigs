import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { mergeConfig } from 'vite';
import solid from 'vite-plugin-solid';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const deduplicateMergedDependencies = (config) => ({
  ...config,
  ...(config.optimizeDeps
    ? {
        optimizeDeps: {
          ...config.optimizeDeps,
          ...(config.optimizeDeps.include ? { include: [...new Set(config.optimizeDeps.include)] } : {}),
          ...(config.optimizeDeps.exclude ? { exclude: [...new Set(config.optimizeDeps.exclude)] } : {}),
        },
      }
    : {}),
  ...(config.resolve?.dedupe
    ? {
        resolve: {
          ...config.resolve,
          dedupe: [...new Set(config.resolve.dedupe)],
        },
      }
    : {}),
});

const createAlias = (projectRoot, alias, srcDir) =>
  alias === null ? [] : [{ find: alias, replacement: resolve(projectRoot, srcDir) }];

const createProxy = (apiProxy) => {
  if (!apiProxy?.enabled) {
    return undefined;
  }

  const {
    env = {},
    envVar = 'VITE_API_BASE_URL',
    target,
    fallbackTarget,
    path = '/api',
    changeOrigin = true,
    secure = false,
    rewrite,
  } = apiProxy;
  const proxyTarget = target ?? env[envVar] ?? fallbackTarget ?? 'http://localhost:5000';
  const defaultRewrite = (requestPath) => requestPath.replace(new RegExp(`^${escapeRegExp(path)}`, 'u'), '');

  return {
    [path]: {
      target: proxyTarget,
      changeOrigin,
      secure,
      ...(rewrite === false ? {} : { rewrite: rewrite ?? defaultRewrite }),
    },
  };
};

const createLinkedWorkspaceConfig = (projectRoot, linkedWorkspace) => {
  if (!linkedWorkspace?.enabled) {
    return {};
  }

  if (typeof linkedWorkspace.workspacePath !== 'string' || linkedWorkspace.workspacePath.length === 0) {
    throw new TypeError('linkedWorkspace.workspacePath must be a non-empty string when enabled.');
  }

  if (typeof linkedWorkspace.packageName !== 'string' || linkedWorkspace.packageName.length === 0) {
    throw new TypeError('linkedWorkspace.packageName must be a non-empty string when enabled.');
  }

  const workspacePath = resolve(projectRoot, linkedWorkspace.workspacePath);
  const aliases = (linkedWorkspace.fileAliases ?? []).map((fileAlias) => {
    const from = typeof fileAlias === 'string' ? fileAlias : fileAlias.from;
    const local = typeof fileAlias === 'string' ? undefined : fileAlias.local;

    return {
      find: resolve(workspacePath, 'node_modules', from),
      replacement: local ?? resolve(projectRoot, 'node_modules', from),
    };
  });

  return {
    resolve: {
      alias: aliases,
      dedupe: [...(linkedWorkspace.dedupe ?? [])],
    },
    optimizeDeps: {
      include: [...(linkedWorkspace.optimizeDepsInclude ?? [])],
      exclude: [...(linkedWorkspace.optimizeDepsExclude ?? [linkedWorkspace.packageName])],
    },
    server: {
      fs: {
        allow: [projectRoot, workspacePath],
      },
    },
  };
};

export const createSolidAppViteConfig = (userConfig = {}, options = {}) => {
  const {
    projectRoot = process.cwd(),
    alias = '~',
    srcDir = 'src',
    port,
    host,
    solidPluginOptions,
    apiProxy,
    linkedWorkspace,
  } = options;
  const proxy = createProxy(apiProxy);
  const baseConfig = {
    plugins: [solid(solidPluginOptions)],
    resolve: {
      alias: createAlias(projectRoot, alias, srcDir),
    },
    ...(port !== undefined || host !== undefined || proxy
      ? {
          server: {
            ...(port !== undefined ? { port } : {}),
            ...(host !== undefined ? { host } : {}),
            ...(proxy ? { proxy } : {}),
          },
        }
      : {}),
    ...(port !== undefined ? { preview: { port } } : {}),
  };
  const linkedConfig = createLinkedWorkspaceConfig(projectRoot, linkedWorkspace);

  return deduplicateMergedDependencies(mergeConfig(mergeConfig(baseConfig, linkedConfig), userConfig));
};

export const readPeerDependencies = (packageJsonPath = resolve(process.cwd(), 'package.json')) => {
  try {
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return [...new Set([...Object.keys(manifest.peerDependencies ?? {}), ...Object.keys(manifest.dependencies ?? {})])];
  } catch {
    return [];
  }
};

const createExternalMatcher = (externalPackages) => {
  const packagePattern = externalPackages.length
    ? new RegExp(`^(?:${externalPackages.map(escapeRegExp).join('|')})(?:/|$)`, 'u')
    : null;

  return (id) => id.includes('node_modules') || packagePattern?.test(id) === true;
};

const loadDtsPlugin = async (dts) => {
  if (dts === false) {
    return null;
  }

  const dtsModule = await import('vite-plugin-dts');
  const createDtsPlugin = dtsModule.default ?? dtsModule;
  return createDtsPlugin({ insertTypesEntry: true, ...dts });
};

export const createSolidLibViteConfig = async (userConfig = {}, options = {}) => {
  const {
    projectRoot = process.cwd(),
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
    dts = {},
    solidPluginOptions,
  } = options;

  if (typeof fileName !== 'string' || fileName.length === 0) {
    throw new TypeError('fileName must be a non-empty string.');
  }

  const manifestPackages = externalizeFromPackageJson ? readPeerDependencies(resolve(projectRoot, 'package.json')) : [];
  const externals = [...new Set([...externalPackages, ...manifestPackages])];
  const dtsPlugin = await loadDtsPlugin(dts);
  const plugins = [solid(solidPluginOptions), ...(dtsPlugin ? [dtsPlugin] : [])];
  const normalizedModulesRoot = preserveModulesRoot.replaceAll('\\', '/').replace(/\/$/u, '');
  const modulesRootPattern = new RegExp(`^${escapeRegExp(normalizedModulesRoot)}/?`, 'u');
  const baseConfig = {
    plugins,
    resolve: {
      alias: createAlias(projectRoot, alias, srcDir),
    },
    build: {
      target,
      cssCodeSplit,
      lib: {
        entry: resolve(projectRoot, entry),
        formats,
        fileName,
      },
      rollupOptions: {
        external: createExternalMatcher(externals),
        output: {
          preserveModules,
          preserveModulesRoot,
          entryFileNames: (chunkInfo) => `${chunkInfo.name.replaceAll('\\', '/').replace(modulesRootPattern, '')}.js`,
        },
      },
    },
  };

  return deduplicateMergedDependencies(mergeConfig(baseConfig, userConfig));
};
