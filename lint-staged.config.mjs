export default {
  '*.mjs': ['eslint --fix --max-warnings 0', 'prettier --write'],
  '*.{mts,cjs,json,md,yml,yaml}': 'prettier --write',
};
