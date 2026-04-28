// This repo only ships config files; it doesn't have application source to lint
// or stylelint. We just run Prettier on everything Prettier can format.
export default {
  '*.{js,jsx,ts,tsx,mjs,cjs,json,md,yml,yaml,html,css}': ['prettier --write'],
};
