import type { Options as SolidPluginOptions } from 'vite-plugin-solid';
import type { DepOptimizationOptions, UserConfig } from 'vite';

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

export declare const solidMarkdownOptimizeDeps: DepOptimizationOptions;

export declare function createSolidAppViteConfig(
  userConfig?: UserConfig,
  options?: CreateSolidAppViteConfigOptions,
): UserConfig;
