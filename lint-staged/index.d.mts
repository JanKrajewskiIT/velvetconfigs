export interface CreateLintStagedConfigOptions {
  readonly eslintTarget?: string;
  readonly prettierTarget?: string;
  readonly stylelintTarget?: string;
}

export type LintStagedConfig = Record<string, string[]>;

export declare const createLintStagedConfig: (options?: CreateLintStagedConfigOptions) => LintStagedConfig;

export declare const lintStagedConfig: LintStagedConfig;

export default lintStagedConfig;
