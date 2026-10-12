export interface CreateLintStagedConfigOptions {
  readonly eslintTarget?: string | false;
  readonly prettierTarget?: string | false;
  readonly stylelintTarget?: string | false;
  readonly chunkSize?: number;
  readonly maxCommandLength?: number;
  readonly ignorePaths?: readonly RegExp[];
}

export type LintStagedTask = (files: readonly string[]) => string[];

export type StaticLintStagedConfig = Record<string, string[]>;

export type ChunkedLintStagedConfig = Record<string, LintStagedTask>;

export type LintStagedConfig = Record<string, string[] | LintStagedTask>;

export type StaticLintStagedConfigOptions = CreateLintStagedConfigOptions & {
  readonly chunkSize?: undefined;
  readonly maxCommandLength?: undefined;
  readonly ignorePaths?: undefined;
};

export declare const createLintStagedConfig: {
  (options?: StaticLintStagedConfigOptions): StaticLintStagedConfig;
  (options: CreateLintStagedConfigOptions): LintStagedConfig;
};

export declare const createChunkedLintStagedConfig: (
  options?: CreateLintStagedConfigOptions,
) => ChunkedLintStagedConfig;

export declare const lintStagedConfig: StaticLintStagedConfig;

export default lintStagedConfig;
