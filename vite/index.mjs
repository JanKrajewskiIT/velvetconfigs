import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { mergeConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

const DEFAULT_ALIAS = '~';
const DEFAULT_SRC_DIR = 'src';
const DEFAULT_API_PROXY_PATH = '/api';
const DEFAULT_API_PROXY_ENV_VAR = 'VITE_API_BASE_URL';
const DEFAULT_API_PROXY_FALLBACK = 'http://localhost:5000';

function dedupeArray(values) {
  if (!Array.isArray(values)) return values;
  return Array.from(new Set(values));
}

function dedupeOptimizeAndResolve(config) {
  if (config.optimizeDeps?.include) {
    config.optimizeDeps.include = dedupeArray(config.optimizeDeps.include);
  }
  if (config.optimizeDeps?.exclude) {
    config.optimizeDeps.exclude = dedupeArray(config.optimizeDeps.exclude);
  }
  if (config.resolve?.dedupe) {
    config.resolve.dedupe = dedupeArray(config.resolve.dedupe);
  }
  return config;
}

function resolveAliasConfig(alias, srcDir, projectRoot) {
  if (alias === null) return undefined;
  const token = alias ?? DEFAULT_ALIAS;
  const dir = srcDir ?? DEFAULT_SRC_DIR;
  return {
    [token]: resolvePath(projectRoot, dir),
  };
}

function resolveApiProxyTarget(apiProxy) {
  const explicit = apiProxy.target;
  if (explicit) return explicit;
  const envVar = apiProxy.envVar ?? DEFAULT_API_PROXY_ENV_VAR;
  const fromEnv = apiProxy.env?.[envVar];
  if (fromEnv) return fromEnv;
  if (apiProxy.fallbackTarget) return apiProxy.fallbackTarget;
  return DEFAULT_API_PROXY_FALLBACK;
}

function buildApiProxyEntry(apiProxy) {
  if (!apiProxy || !apiProxy.enabled) return undefined;
  const path = apiProxy.path ?? DEFAULT_API_PROXY_PATH;
  const target = resolveApiProxyTarget(apiProxy);

  let rewrite;
  if (apiProxy.rewrite === false) {
    rewrite = undefined;
  } else if (typeof apiProxy.rewrite === 'function') {
    rewrite = apiProxy.rewrite;
  } else {
    const stripPrefix = new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u');
    rewrite = (incoming) => incoming.replace(stripPrefix, '');
  }

  const entry = {
    target,
    changeOrigin: apiProxy.changeOrigin ?? true,
    secure: apiProxy.secure ?? false,
  };
  if (rewrite) entry.rewrite = rewrite;
  return { path, entry };
}

function buildLinkedWorkspaceOverlay(linked, projectRoot) {
  if (!linked || !linked.enabled) return undefined;
  if (!linked.workspacePath || !linked.packageName) {
    throw new Error('createSolidAppViteConfig: linkedWorkspace.enabled requires both workspacePath and packageName.');
  }

  const workspacePath = resolvePath(projectRoot, linked.workspacePath);
  const workspaceNodeModules = resolvePath(workspacePath, 'node_modules');
  const localNodeModules = resolvePath(projectRoot, 'node_modules');

  const aliasEntries = [];
  for (const raw of linked.fileAliases ?? []) {
    const entry = typeof raw === 'string' ? { from: raw } : raw;
    if (!entry.from) continue;
    aliasEntries.push({
      find: resolvePath(workspaceNodeModules, entry.from),
      replacement: entry.local ?? resolvePath(localNodeModules, entry.from),
    });
  }

  return {
    resolve: {
      alias: aliasEntries,
      dedupe: linked.dedupe ?? [],
    },
    optimizeDeps: {
      include: linked.optimizeDepsInclude ?? [],
      exclude: linked.optimizeDepsExclude ?? [linked.packageName],
    },
    server: {
      fs: {
        allow: [projectRoot, workspacePath],
      },
    },
  };
}

export function createSolidAppViteConfig(userConfig = {}, options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const aliasConfig = resolveAliasConfig(options.alias, options.srcDir, projectRoot);
  const apiProxy = buildApiProxyEntry(options.apiProxy);

  const base = {
    plugins: [solidPlugin(options.solidPluginOptions)],
    resolve: aliasConfig ? { alias: aliasConfig } : undefined,
    server: {},
    preview: {},
  };

  if (options.port !== undefined) {
    base.server.port = options.port;
    base.preview.port = options.port;
  }
  if (options.host !== undefined) {
    base.server.host = options.host;
  }
  if (apiProxy) {
    base.server.proxy = { [apiProxy.path]: apiProxy.entry };
  }

  const overlay = buildLinkedWorkspaceOverlay(options.linkedWorkspace, projectRoot);

  let merged = base;
  if (overlay) merged = mergeConfig(merged, overlay);
  if (userConfig && Object.keys(userConfig).length > 0) {
    merged = mergeConfig(merged, userConfig);
  }
  return dedupeOptimizeAndResolve(merged);
}

export function readPeerDependencies(packageJsonPath) {
  try {
    const path = packageJsonPath ?? resolvePath(process.cwd(), 'package.json');
    const raw = readFileSync(path, 'utf8');
    const manifest = JSON.parse(raw);
    const peers = Object.keys(manifest.peerDependencies ?? {});
    const deps = Object.keys(manifest.dependencies ?? {});
    return Array.from(new Set([...peers, ...deps]));
  } catch {
    return [];
  }
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function buildExternalMatcher(externalNames) {
  if (externalNames.length === 0) {
    return (id) => /node_modules/u.test(id);
  }
  const pattern = new RegExp(`^(?:${externalNames.map(escapeForRegex).join('|')})(?:/.*)?$`, 'u');
  return (id) => /node_modules/u.test(id) || pattern.test(id);
}

async function loadDtsPlugin(dts) {
  if (dts === false) return null;
  const mod = await import('vite-plugin-dts');
  const factory = mod.default ?? mod;
  const options = typeof dts === 'object' && dts !== null ? dts : {};
  return factory({ insertTypesEntry: true, ...options });
}

function resolveLibFileName(fileName) {
  if (!fileName) {
    throw new Error('createSolidLibViteConfig: `fileName` is required.');
  }
  return fileName;
}

export async function createSolidLibViteConfig(userConfig = {}, options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const aliasConfig = resolveAliasConfig(options.alias, options.srcDir, projectRoot);
  const entry = options.entry ?? 'src/index.ts';
  const fileName = resolveLibFileName(options.fileName);
  const formats = options.formats ?? ['es'];
  const preserveModules = options.preserveModules ?? true;
  const preserveModulesRoot = options.preserveModulesRoot ?? 'src';
  const cssCodeSplit = options.cssCodeSplit ?? false;
  const target = options.target ?? 'esnext';

  const externalNames = new Set(options.externalPackages ?? []);
  if (options.externalizeFromPackageJson) {
    for (const name of readPeerDependencies(resolvePath(projectRoot, 'package.json'))) {
      externalNames.add(name);
    }
  }
  const externalMatcher = buildExternalMatcher([...externalNames]);

  const plugins = [solidPlugin(options.solidPluginOptions)];
  const dtsPlugin = await loadDtsPlugin(options.dts);
  if (dtsPlugin) plugins.push(dtsPlugin);

  const entryFileNames = (chunkInfo) => {
    const name = chunkInfo.name ?? '';
    const stripPrefix = new RegExp(`^${escapeForRegex(preserveModulesRoot)}/`, 'u');
    const cleaned = name.replace(stripPrefix, '');
    return `${cleaned}.js`;
  };

  const base = {
    plugins,
    resolve: aliasConfig ? { alias: aliasConfig } : undefined,
    build: {
      target,
      cssCodeSplit,
      lib: {
        entry: resolvePath(projectRoot, entry),
        fileName,
        formats,
      },
      rollupOptions: {
        external: externalMatcher,
        output: {
          preserveModules,
          preserveModulesRoot,
          entryFileNames,
        },
      },
    },
  };

  let merged = base;
  if (userConfig && Object.keys(userConfig).length > 0) {
    merged = mergeConfig(merged, userConfig);
  }
  return dedupeOptimizeAndResolve(merged);
}
