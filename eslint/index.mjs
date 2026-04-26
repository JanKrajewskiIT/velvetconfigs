import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import solidPlugin from 'eslint-plugin-solid/configs/typescript';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import cssModulesPlugin from 'eslint-plugin-css-modules';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

export function createEslintConfig({ tsconfigRootDir, ignorePaths = [] }) {
  return defineConfig([
    eslint.configs.recommended,
    jsxA11yPlugin.flatConfigs.recommended,
    ...tseslint.configs.strictTypeChecked,
    solidPlugin,
    prettier,
    globalIgnores(['dist', '**/vite-env.d.ts', '**/*.d.ts', 'vite.config.ts', ...ignorePaths]),
    {
      ignores: ['**/*.mjs', '**/*.mts'],
    },
    {
      files: ['**/*.{js,cjs,ts,jsx,tsx}'],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
        globals: { ...globals.browser },
      },
      plugins: {
        'unused-imports': unusedImportsPlugin,
        'simple-import-sort': simpleImportSortPlugin,
        'css-modules': cssModulesPlugin,
      },
      rules: {
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        'css-modules/no-undef-class': 'warn',
        'css-modules/no-unused-class': ['warn', { camelCase: true }],
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'error',
          {
            vars: 'all',
            varsIgnorePattern: '^_',
            args: 'after-used',
            argsIgnorePattern: '^_',
          },
        ],
        'no-console': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-unnecessary-type-arguments': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'warn',
        '@typescript-eslint/no-unsafe-type-assertion': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-misused-promises': 'warn',
        'solid/reactivity': 'warn',
        'require-unicode-regexp': ['error', { requireFlag: 'u' }],
        'no-restricted-syntax': [
          'error',
          {
            selector: "JSXElement[openingElement.name.name='DialogTitle'][openingElement.selfClosing=false]",
            message: 'Use `label` prop on DialogTitle instead of children.',
          },
          {
            selector: "JSXElement[openingElement.name.name='Alert'][openingElement.selfClosing=false]",
            message: 'Use `message` prop on Alert instead of children.',
          },
          {
            selector: "JSXElement[openingElement.name.name='Banner'][openingElement.selfClosing=false]",
            message: 'Use `message` prop on Banner instead of children.',
          },
          {
            selector: "JSXElement[openingElement.name.name='ErrorMessage'][openingElement.selfClosing=false]",
            message: 'Use `message` prop on ErrorMessage instead of children.',
          },
          {
            selector: "JSXElement[openingElement.name.name='ListItem'][openingElement.selfClosing=false]",
            message: 'Use `label` prop on ListItem instead of children.',
          },
          {
            selector: "JSXElement[openingElement.name.name='Chip'][openingElement.selfClosing=false]",
            message: 'Use `label` prop on Chip instead of children.',
          },
          {
            selector: "JSXElement[openingElement.name.name='EmptyState'][openingElement.selfClosing=false]",
            message: 'Use `action` prop on EmptyState instead of children.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='IconButton']",
            message: 'Use `label` prop on IconButton instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='RoundIconButton']",
            message: 'Use `label` prop on RoundIconButton instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='MediaNavButton']",
            message: 'Use `label` prop on MediaNavButton instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='Alert']",
            message: 'Use `label` prop on Alert instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='SidebarNav']",
            message: 'Use `label` prop on SidebarNav instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='Sheet']",
            message: 'Use `label` prop on Sheet instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='AccordionItem']",
            message: 'Use `label` prop on AccordionItem instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='SectionCard']",
            message: 'Use `label` prop on SectionCard instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='ConfirmDialog']",
            message: 'Use `label` prop on ConfirmDialog instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='ConfirmAction']",
            message: 'Use `label` prop on ConfirmAction instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='MarkdownEditDialog']",
            message: 'Use `label` prop on MarkdownEditDialog instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='ColumnManager']",
            message: 'Use `label` prop on ColumnManager instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='QueryBuilder']",
            message: 'Use `label` prop on QueryBuilder instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='NotificationCenter']",
            message: 'Use `label` prop on NotificationCenter instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='FallbackState']",
            message: 'Use `label` prop on FallbackState instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='ErrorFallback']",
            message: 'Use `label` prop on ErrorFallback instead of `title`.',
          },
          {
            selector: "JSXAttribute[name.name='title'][parent.name.name='AccessDenied']",
            message: 'Use `label` prop on AccessDenied instead of `title`.',
          },
        ],
      },
    },
    {
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.name='t'][arguments.0.type='Literal'][arguments.0.value!=null]",
            message: 'Use `ts()` for literal i18n keys. Keep `t()` for dynamic keys only.',
          },
          {
            selector:
              "CallExpression[callee.name='t'][arguments.0.type='TemplateLiteral'][arguments.0.expressions.length=0]",
            message: 'Use `ts()` for literal i18n keys. Keep `t()` for dynamic keys only.',
          },
        ],
      },
    },
  ]);
}
