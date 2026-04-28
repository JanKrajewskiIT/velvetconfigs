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
  /**
   * - `false` disables rewriting (default behaviour strips the `path` prefix).
   * - A function lets you fully customise the rewrite.
   */
  rewrite?: false | ((requestPath: string) => string);
}

export interface LinkedWorkspaceFileAlias {
  /** Path relative to the workspace's `node_modules` (e.g. "lightweight-charts/dist/lightweight-charts.production.mjs") */
  from: string;
  /** Optional explicit local target. Defaults to `./node_modules/<from>`. */
  local?: string;
}

export interface LinkedWorkspaceOptions {
  enabled?: boolean;
  /** Required when `enabled`. Absolute or relative path to the linked package's repo root. */
  workspacePath?: string;
  /** Required when `enabled`. The package name (e.g. "@scope/ui") that should be excluded from optimizeDeps. */
  packageName?: string;
  dedupe?: string[];
  optimizeDepsInclude?: string[];
  optimizeDepsExclude?: string[];
  /** Aliases to redirect file imports from the workspace's node_modules into local node_modules. */
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
  /** Required. e.g. "my-lib" -> dist/my-lib.js */
  fileName: string;
  formats?: LibraryFormats[];
  /** Package names to externalize (matched as `^name(/|$)`). Always also externalizes node_modules. */
  externalPackages?: string[];
  /** When true, also externalizes everything in `dependencies` and `peerDependencies` from package.json. */
  externalizeFromPackageJson?: boolean;
  preserveModules?: boolean;
  preserveModulesRoot?: string;
  cssCodeSplit?: boolean;
  /** Forwarded to `build.target`. Defaults to 'esnext' for libs. */
  target?: BuildOptions['target'];
  /** Pass `false` to disable vite-plugin-dts. Otherwise forwarded to dts(). */
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
