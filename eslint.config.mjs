import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default defineConfig(globalIgnores(['.agents/**']), js.configs.recommended, eslintConfigPrettier, {
  files: ['**/*.mjs'],
  languageOptions: { globals: globals.node },
});
