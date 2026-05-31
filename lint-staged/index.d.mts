export interface CreateLintStagedConfigOptions {
  eslintTarget?: string;
  prettierTarget?: string;
  stylelintTarget?: string;
}

export type LintStagedConfig = Record<string, string[]>;

export function createLintStagedConfig(options?: CreateLintStagedConfigOptions): LintStagedConfig;

export const lintStagedConfig: LintStagedConfig;

declare const _default: LintStagedConfig;
export default _default;
