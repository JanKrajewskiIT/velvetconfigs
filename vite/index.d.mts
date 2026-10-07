import type { BuildOptions, LibraryFormats, UserConfig } from 'vite';
import type { PluginOptions as DtsPluginOptions } from 'vite-plugin-dts';
import type { Options as SolidPluginOptions } from 'vite-plugin-solid';

export interface ApiProxyOptions {
  readonly enabled?: boolean;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly envVar?: string;
  readonly target?: string;
  readonly fallbackTarget?: string;
  readonly path?: string;
  readonly changeOrigin?: boolean;
  readonly secure?: boolean;
  readonly rewrite?: ((path: string) => string) | false;
}

export interface LinkedWorkspaceFileAlias {
  readonly from: string;
  readonly local?: string;
}

interface LinkedWorkspaceCommonOptions {
  readonly fileAliases?: readonly (string | LinkedWorkspaceFileAlias)[];
  readonly dedupe?: readonly string[];
  readonly optimizeDepsInclude?: readonly string[];
  readonly optimizeDepsExclude?: readonly string[];
}

export interface EnabledLinkedWorkspaceOptions extends LinkedWorkspaceCommonOptions {
  readonly enabled: true;
  readonly workspacePath: string;
  readonly packageName: string;
}

export interface DisabledLinkedWorkspaceOptions extends LinkedWorkspaceCommonOptions {
  readonly enabled?: false;
  readonly workspacePath?: string;
  readonly packageName?: string;
}

export type LinkedWorkspaceOptions = EnabledLinkedWorkspaceOptions | DisabledLinkedWorkspaceOptions;

export interface SolidViteConfigBaseOptions {
  readonly projectRoot?: string;
  readonly alias?: string | null;
  readonly srcDir?: string;
  readonly solidPluginOptions?: Partial<SolidPluginOptions>;
}

export interface CreateSolidAppViteConfigOptions extends SolidViteConfigBaseOptions {
  readonly port?: number;
  readonly host?: string | boolean;
  readonly apiProxy?: ApiProxyOptions;
  readonly linkedWorkspace?: LinkedWorkspaceOptions;
}

export interface CreateSolidLibViteConfigOptions extends SolidViteConfigBaseOptions {
  readonly entry?: string;
  /** Base output name. Vite ignores it while `preserveModules` is true. */
  readonly fileName: string;
  readonly formats?: readonly LibraryFormats[];
  readonly externalPackages?: readonly string[];
  readonly externalizeFromPackageJson?: boolean;
  readonly preserveModules?: boolean;
  readonly preserveModulesRoot?: string;
  readonly cssCodeSplit?: boolean;
  readonly target?: BuildOptions['target'];
  readonly dts?: false | DtsPluginOptions;
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
