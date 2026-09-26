export interface CreateLintStagedConfigOptions {
  eslintTarget?: string;
  prettierTarget?: string;
  stylelintTarget?: string;
}

export type LintStagedConfig = Record<string, string[]>;

export declare const createLintStagedConfig: (options?: CreateLintStagedConfigOptions) => LintStagedConfig;
export declare const lintStagedConfig: LintStagedConfig;

declare const defaultExport: LintStagedConfig;
export default defaultExport;
