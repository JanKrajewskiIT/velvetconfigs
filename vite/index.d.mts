import type { BuildOptions, LibraryFormats, UserConfig } from 'vite';
import type { PluginOptions as DtsPluginOptions } from 'vite-plugin-dts';
import type { Options as SolidPluginOptions } from 'vite-plugin-solid';

export interface ApiProxyOptions {
  enabled?: boolean;
  env?: Readonly<Record<string, string | undefined>>;
  envVar?: string;
  target?: string;
  fallbackTarget?: string;
  path?: string;
  changeOrigin?: boolean;
  secure?: boolean;
  rewrite?: false | ((path: string) => string);
}

export interface LinkedWorkspaceFileAlias {
  from: string;
  local?: string;
}

export interface LinkedWorkspaceOptions {
  enabled?: boolean;
  workspacePath?: string;
  packageName?: string;
  fileAliases?: readonly (string | LinkedWorkspaceFileAlias)[];
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
  formats?: readonly LibraryFormats[];
  externalPackages?: readonly string[];
  externalizeFromPackageJson?: boolean;
  preserveModules?: boolean;
  preserveModulesRoot?: string;
  cssCodeSplit?: boolean;
  target?: BuildOptions['target'];
  dts?: false | DtsPluginOptions;
  solidPluginOptions?: SolidPluginOptions;
}

export declare const createSolidAppViteConfig: (
  userConfig?: UserConfig,
  options?: CreateSolidAppViteConfigOptions,
) => UserConfig;
export declare const createSolidLibViteConfig: (
  userConfig: UserConfig | undefined,
  options: CreateSolidLibViteConfigOptions,
) => Promise<UserConfig>;
export declare const readPeerDependencies: (packageJsonPath?: string) => string[];

export type { BuildOptions, LibraryFormats, SolidPluginOptions, UserConfig };
