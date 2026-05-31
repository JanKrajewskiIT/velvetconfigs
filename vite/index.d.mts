import type { BuildOptions, LibraryFormats, UserConfig } from 'vite';
import type { Options as SolidPluginOptions } from 'vite-plugin-solid';

export interface ApiProxyOptions {
  enabled?: boolean;
  env?: Record<string, string | undefined>;
  envVar?: string;
  target?: string;
  fallbackTarget?: string;
  path?: string;
  changeOrigin?: boolean;
  secure?: boolean;
  rewrite?: ((path: string) => string) | false;
}

export interface LinkedWorkspaceFileAlias {
  from: string;
  local?: string;
}

export interface LinkedWorkspaceOptions {
  enabled?: boolean;
  workspacePath?: string;
  packageName?: string;
  fileAliases?: ReadonlyArray<string | LinkedWorkspaceFileAlias>;
  dedupe?: readonly string[];
  optimizeDepsInclude?: readonly string[];
  optimizeDepsExclude?: readonly string[];
}

export interface CreateSolidAppViteConfigOptions {
  projectRoot?: string;
  alias?: string | null;
  srcDir?: string;
  port?: number;
  host?: string | boolean;
  solidPluginOptions?: SolidPluginOptions;
  apiProxy?: ApiProxyOptions;
  linkedWorkspace?: LinkedWorkspaceOptions;
}

export interface CreateSolidLibViteConfigOptions {
  projectRoot?: string;
  alias?: string | null;
  srcDir?: string;
  entry?: string;
  fileName: string;
  formats?: LibraryFormats[];
  externalPackages?: readonly string[];
  externalizeFromPackageJson?: boolean;
  preserveModules?: boolean;
  preserveModulesRoot?: string;
  cssCodeSplit?: boolean;
  target?: BuildOptions['target'];
  dts?: false | Record<string, unknown>;
  solidPluginOptions?: SolidPluginOptions;
}

export function createSolidAppViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidAppViteConfigOptions,
): UserConfig;

export function createSolidLibViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidLibViteConfigOptions,
): Promise<UserConfig>;

export function readPeerDependencies(packageJsonPath?: string): string[];
