export function createLintStagedConfig({
  eslintTarget = '*.{ts,tsx}',
  prettierTarget = '*.{json,md}',
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
