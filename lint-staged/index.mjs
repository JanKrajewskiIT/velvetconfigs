export function createLintStagedConfig({
  eslintTarget = '*.{js,jsx,ts,tsx,mjs,cjs}',
  prettierTarget = '*.{json,md,yml,yaml,html}',
  stylelintTarget = '*.css',
} = {}) {
  return {
    [eslintTarget]: ['eslint --fix --no-warn-ignored', 'prettier --write'],
    [stylelintTarget]: ['stylelint --fix', 'prettier --write'],
    [prettierTarget]: ['prettier --write'],
  };
}

export const lintStagedConfig = createLintStagedConfig();

export default lintStagedConfig;
