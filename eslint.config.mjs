import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

import { suppressionPlugin } from './eslint/suppression-plugin.mjs';

export default defineConfig(
  globalIgnores(['.agents/**']),
  js.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: { 'velvet-quality': suppressionPlugin },
    linterOptions: { reportUnusedDisableDirectives: 'error', reportUnusedInlineConfigs: 'error' },
    rules: { 'velvet-quality/require-disable-reason': 'error' },
  },
  { files: ['**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['browser/**/*.mjs'], languageOptions: { globals: globals.browser } },
);
