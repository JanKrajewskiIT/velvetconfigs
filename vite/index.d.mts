import type { Options as SolidPluginOptions } from 'vite-plugin-solid';
import type { UserConfig, LibraryFormats, BuildOptions } from 'vite';

export interface ApiProxyOptions {
  enabled?: boolean;
  env?: Record<string, string | undefined>;
  envVar?: string;
  target?: string;
  fallbackTarget?: string;
  path?: string;
  changeOrigin?: boolean;
  secure?: boolean;
  rewrite?: false | ((requestPath: string) => string);
}

export interface LinkedWorkspaceFileAlias {
  from: string;
  local?: string;
}

export interface LinkedWorkspaceOptions {
  enabled?: boolean;
  workspacePath?: string;
  packageName?: string;
  dedupe?: string[];
  optimizeDepsInclude?: string[];
  optimizeDepsExclude?: string[];
  fileAliases?: Array<string | LinkedWorkspaceFileAlias>;
}

export interface CreateSolidAppViteConfigOptions {
  alias?: string | null;
  srcDir?: string;
  port?: number;
  host?: string | boolean;
  solidPluginOptions?: Partial<SolidPluginOptions>;
  apiProxy?: ApiProxyOptions;
  linkedWorkspace?: LinkedWorkspaceOptions;
}

export interface CreateSolidLibViteConfigOptions {
  alias?: string | null;
  srcDir?: string;
  entry?: string;
  fileName: string;
  formats?: LibraryFormats[];
  externalPackages?: string[];
  externalizeFromPackageJson?: boolean;
  preserveModules?: boolean;
  preserveModulesRoot?: string;
  cssCodeSplit?: boolean;
  target?: BuildOptions['target'];
  dts?: false | Record<string, unknown>;
  solidPluginOptions?: Partial<SolidPluginOptions>;
}

export declare function readPeerDependencies(packageJsonPath?: string): string[];

export declare function createSolidAppViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidAppViteConfigOptions,
): UserConfig;

export declare function createSolidLibViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidLibViteConfigOptions,
): Promise<UserConfig>;
