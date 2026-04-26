import type { Options as SolidPluginOptions } from 'vite-plugin-solid';
import type { DepOptimizationOptions, UserConfig, LibraryFormats } from 'vite';

export interface ApiProxyOptions {
  enabled?: boolean;
  env?: Record<string, string | undefined>;
  envVar?: string;
  target?: string;
  fallbackTarget?: string;
  path?: string;
  changeOrigin?: boolean;
  secure?: boolean;
  rewrite?: boolean;
}

export interface LinkedWorkspaceOptions {
  enabled?: boolean;
  workspacePath?: string;
  dedupe?: string[];
  optimizeDepsInclude?: string[];
  optimizeDepsExclude?: string[];
}

export interface CreateSolidAppViteConfigOptions {
  alias?: string | null;
  srcDir?: string;
  port?: number | null;
  includeSolidMarkdownDeps?: boolean;
  solidPluginOptions?: Partial<SolidPluginOptions>;
  apiProxy?: ApiProxyOptions;
  linkedWorkspace?: LinkedWorkspaceOptions;
}

export interface CreateSolidLibViteConfigOptions {
  alias?: string | null;
  srcDir?: string;
  entry?: string;
  /** Required. e.g. "velvet-ui" -> dist/velvet-ui.js */
  fileName: string;
  formats?: LibraryFormats[];
  /** Package names to externalize (matched as `^name(/|$)`). Always also externalizes node_modules. */
  externalPackages?: string[];
  preserveModules?: boolean;
  preserveModulesRoot?: string;
  cssCodeSplit?: boolean;
  /** Pass `false` to disable vite-plugin-dts. Otherwise forwarded to dts(). */
  dts?: false | Record<string, unknown>;
  solidPluginOptions?: Partial<SolidPluginOptions>;
}

export declare const solidMarkdownOptimizeDeps: DepOptimizationOptions;

export declare function createSolidAppViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidAppViteConfigOptions,
): UserConfig;

export declare function createSolidLibViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidLibViteConfigOptions,
): Promise<UserConfig>;
