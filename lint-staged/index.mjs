const DEFAULT_ESLINT_TARGET = '*.{js,jsx,ts,tsx,mjs,cjs}';
const DEFAULT_PRETTIER_TARGET = '*.{json,md,yml,yaml,html}';
const DEFAULT_STYLELINT_TARGET = '*.css';

export function createLintStagedConfig(options = {}) {
  const eslintTarget = options.eslintTarget ?? DEFAULT_ESLINT_TARGET;
  const prettierTarget = options.prettierTarget ?? DEFAULT_PRETTIER_TARGET;
  const stylelintTarget = options.stylelintTarget ?? DEFAULT_STYLELINT_TARGET;

  return {
    [eslintTarget]: ['eslint --fix --no-warn-ignored', 'prettier --write'],
    [stylelintTarget]: ['stylelint --fix', 'prettier --write'],
    [prettierTarget]: ['prettier --write'],
  };
}

export const lintStagedConfig = createLintStagedConfig();

export default lintStagedConfig;
