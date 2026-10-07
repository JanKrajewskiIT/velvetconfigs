import { readFileSync } from 'node:fs';
import path from 'node:path';

import { mergeConfig, normalizePath } from 'vite';
import solidPlugin from 'vite-plugin-solid';

const DEFAULT_ALIAS = '~';
const DEFAULT_SRC_DIR = 'src';
const DEFAULT_API_PROXY_ENV_VAR = 'VITE_API_BASE_URL';
const DEFAULT_API_PROXY_PATH = '/api';
const DEFAULT_API_PROXY_TARGET = 'http://localhost:5000';
const DEFAULT_LIB_FORMATS = ['es'];
const DEFAULT_LIB_TARGET = 'esnext';
const REQUIRED_LINKED_WORKSPACE_FIELDS = ['workspacePath', 'packageName'];
const DEDUPED_ARRAY_PATHS = [
  ['optimizeDeps', 'include'],
  ['optimizeDeps', 'exclude'],
  ['resolve', 'dedupe'],
];

const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0;

const resolveCallable = (moduleExport, specifier) => {
  const candidates = [moduleExport, moduleExport?.default, moduleExport?.default?.default];
  const factory = candidates.find((candidate) => typeof candidate === 'function');
  if (factory === undefined) {
    throw new TypeError(`"${specifier}" does not export a plugin factory.`);
  }
  return factory;
};

const createSolidPlugin = resolveCallable(solidPlugin, 'vite-plugin-solid');

const resolveProjectRoot = (projectRoot) => path.resolve(projectRoot ?? process.cwd());

const mergeLayers = (layers) => layers.reduce((merged, layer) => mergeConfig(merged, layer));

const dedupeConfigArrays = (config) => {
  const result = { ...config };
  for (const [section, key] of DEDUPED_ARRAY_PATHS) {
    const values = config[section]?.[key];
    if (Array.isArray(values)) {
      result[section] = { ...result[section], [key]: [...new Set(values)] };
    }
  }
  return result;
};

const buildAliasConfig = ({ alias, projectRoot, srcDir }) =>
  alias === null ? {} : { resolve: { alias: { [alias]: path.resolve(projectRoot, srcDir) } } };

const buildServerConfig = ({ port, host }) => {
  const config = {};
  if (port !== undefined) {
    config.server = { port };
    config.preview = { port };
  }
  if (host !== undefined) {
    config.server = { ...config.server, host };
  }
  return config;
};

const createProxyRewrite = (proxyPath) => {
  const prefix = new RegExp(`^${RegExp.escape(proxyPath)}`, 'u');
  return (requestPath) => requestPath.replace(prefix, '');
};

const buildApiProxyConfig = (apiProxy) => {
  if (!apiProxy?.enabled) {
    return {};
  }
  const {
    env,
    envVar = DEFAULT_API_PROXY_ENV_VAR,
    target,
    fallbackTarget,
    path: proxyPath = DEFAULT_API_PROXY_PATH,
    changeOrigin = true,
    secure = true,
    rewrite = createProxyRewrite(proxyPath),
  } = apiProxy;
  const resolvedTarget = [target, env?.[envVar], fallbackTarget].find(isNonEmptyString) ?? DEFAULT_API_PROXY_TARGET;
  const proxyOptions = { target: resolvedTarget, changeOrigin, secure };
  if (rewrite !== false) {
    proxyOptions.rewrite = rewrite;
  }
  return { server: { proxy: { [proxyPath]: proxyOptions } } };
};

const toLinkedFileAlias = (entry, workspaceRoot, projectRoot) => {
  const { from, local } = typeof entry === 'string' ? { from: entry } : entry;
  return {
    find: normalizePath(path.join(workspaceRoot, 'node_modules', from)),
    replacement: local ?? normalizePath(path.join(projectRoot, 'node_modules', from)),
  };
};

const buildLinkedWorkspaceConfig = (linkedWorkspace, projectRoot) => {
  if (!linkedWorkspace?.enabled) {
    return {};
  }
  const missing = REQUIRED_LINKED_WORKSPACE_FIELDS.filter((field) => !isNonEmptyString(linkedWorkspace[field]));
  if (missing.length > 0) {
    throw new Error(
      `createSolidAppViteConfig: linkedWorkspace.enabled requires ${missing.map((field) => `"${field}"`).join(' and ')}.`,
    );
  }
  const {
    workspacePath,
    packageName,
    fileAliases = [],
    dedupe = [],
    optimizeDepsInclude = [],
    optimizeDepsExclude = [packageName],
  } = linkedWorkspace;
  const workspaceRoot = path.resolve(projectRoot, workspacePath);
  return {
    resolve: {
      alias: fileAliases.map((entry) => toLinkedFileAlias(entry, workspaceRoot, projectRoot)),
      dedupe,
    },
    optimizeDeps: { include: optimizeDepsInclude, exclude: optimizeDepsExclude },
    server: { fs: { allow: [projectRoot, workspaceRoot] } },
  };
};

export const createSolidAppViteConfig = (userConfig = {}, options = {}) => {
  const { alias = DEFAULT_ALIAS, srcDir = DEFAULT_SRC_DIR, port, host, solidPluginOptions, apiProxy } = options;
  const projectRoot = resolveProjectRoot(options.projectRoot);
  return dedupeConfigArrays(
    mergeLayers([
      { plugins: [createSolidPlugin(solidPluginOptions)] },
      buildAliasConfig({ alias, projectRoot, srcDir }),
      buildServerConfig({ port, host }),
      buildApiProxyConfig(apiProxy),
      buildLinkedWorkspaceConfig(options.linkedWorkspace, projectRoot),
      userConfig,
    ]),
  );
};

export const readPeerDependencies = (packageJsonPath = path.resolve(process.cwd(), 'package.json')) => {
  try {
    const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const names = [...Object.keys(manifest.peerDependencies ?? {}), ...Object.keys(manifest.dependencies ?? {})];
    return [...new Set(names)];
  } catch {
    // Contract: an unreadable manifest degrades to explicit externals instead of failing the config load.
    return [];
  }
};

const createExternalMatcher = (packages) => {
  if (packages.length === 0) {
    return (id) => id.includes('node_modules');
  }
  const names = packages.map((name) => RegExp.escape(name)).join('|');
  const packagePattern = new RegExp(`^(?:${names})(?:/.*)?$`, 'u');
  return (id) => id.includes('node_modules') || packagePattern.test(id);
};

const toPosixPath = (value) => value.replaceAll('\\', '/');

const createEntryFileNames = (preserveModulesRoot, qualifyWithFormat) => {
  const rootPrefix = `${toPosixPath(preserveModulesRoot).replace(/\/$/u, '')}/`;
  const extension = qualifyWithFormat ? '.[format].js' : '.js';
  return ({ name }) => {
    const posixName = toPosixPath(name);
    return `${posixName.startsWith(rootPrefix) ? posixName.slice(rootPrefix.length) : posixName}${extension}`;
  };
};

const buildOutputOptions = ({ preserveModules, preserveModulesRoot, formats }) => {
  if (!preserveModules) {
    return { preserveModules };
  }
  const entryFileNames = createEntryFileNames(preserveModulesRoot, formats.length > 1);
  return { preserveModules, preserveModulesRoot, entryFileNames };
};

const loadDtsPlugin = async (dts) => {
  if (dts === false) {
    return null;
  }
  const createDtsPlugin = resolveCallable(await import('vite-plugin-dts'), 'vite-plugin-dts');
  return createDtsPlugin({ insertTypesEntry: true, ...dts });
};

export const createSolidLibViteConfig = async (userConfig = {}, options = {}) => {
  const {
    fileName,
    alias = DEFAULT_ALIAS,
    srcDir = DEFAULT_SRC_DIR,
    entry = `${srcDir}/index.ts`,
    formats = DEFAULT_LIB_FORMATS,
    externalPackages = [],
    externalizeFromPackageJson = false,
    preserveModules = true,
    preserveModulesRoot = srcDir,
    cssCodeSplit = false,
    target = DEFAULT_LIB_TARGET,
    dts,
    solidPluginOptions,
  } = options;
  if (!isNonEmptyString(fileName)) {
    throw new TypeError('createSolidLibViteConfig: "fileName" is required and must be a non-empty string.');
  }
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const externals = externalizeFromPackageJson
    ? [...new Set([...externalPackages, ...readPeerDependencies(path.resolve(projectRoot, 'package.json'))])]
    : externalPackages;

  const plugins = [createSolidPlugin(solidPluginOptions)];
  const dtsPlugin = await loadDtsPlugin(dts);
  if (dtsPlugin !== null) {
    plugins.push(dtsPlugin);
  }

  return dedupeConfigArrays(
    mergeLayers([
      { plugins },
      buildAliasConfig({ alias, projectRoot, srcDir }),
      {
        build: {
          target,
          cssCodeSplit,
          lib: { entry: path.resolve(projectRoot, entry), fileName, formats: [...formats] },
          rollupOptions: {
            external: createExternalMatcher(externals),
            output: buildOutputOptions({ preserveModules, preserveModulesRoot, formats }),
          },
        },
      },
      userConfig,
    ]),
  );
};
