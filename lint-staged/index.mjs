const DEFAULT_TARGETS = {
  eslintTarget: '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}',
  stylelintTarget: '*.css',
  prettierTarget: '*.{json,md,yml,yaml,html}',
};

const PRETTIER_WRITE = 'prettier --write';

export const createLintStagedConfig = ({
  eslintTarget = DEFAULT_TARGETS.eslintTarget,
  stylelintTarget = DEFAULT_TARGETS.stylelintTarget,
  prettierTarget = DEFAULT_TARGETS.prettierTarget,
} = {}) => ({
  [eslintTarget]: ['eslint --fix --no-warn-ignored', PRETTIER_WRITE],
  [stylelintTarget]: ['stylelint --fix', PRETTIER_WRITE],
  [prettierTarget]: [PRETTIER_WRITE],
});

export const lintStagedConfig = createLintStagedConfig();

export default lintStagedConfig;
