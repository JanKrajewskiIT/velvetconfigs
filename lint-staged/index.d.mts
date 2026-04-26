export interface CreateLintStagedConfigOptions {
  eslintTarget?: string;
  prettierTarget?: string;
  stylelintTarget?: string;
}

export type LintStagedConfig = Record<string, string[]>;

export declare function createLintStagedConfig(options?: CreateLintStagedConfigOptions): LintStagedConfig;

export declare const lintStagedConfig: LintStagedConfig;

export default lintStagedConfig;
