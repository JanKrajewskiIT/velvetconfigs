import type { Linter } from 'eslint';

export type FlatConfig = Linter.Config;

export type RestrictedSyntaxRule = Linter.RuleEntry;

export type EslintEnvironment = 'browser' | 'node' | 'worker' | 'serviceworker' | 'jest' | 'vitest';

export interface RestrictedSyntaxSelector {
  readonly selector: string;
  readonly message: string;
}

export interface NoChildrenPropEntry {
  readonly component: string;
  readonly prop: string;
  readonly forbid: readonly string[];
}

export interface LiteralI18nKeyOptions {
  readonly dynamicFunction?: string;
  readonly staticFunction?: string;
}

export interface RuleOverrideConfigOptions {
  readonly name: string;
  readonly files: readonly string[];
  readonly rules: Readonly<Record<string, RestrictedSyntaxRule>>;
}

export interface CreateNodeEslintConfigOptions {
  readonly tsconfigRootDir: string;
  readonly typedFiles?: readonly string[];
  readonly testFiles?: readonly string[];
  readonly ignorePaths?: readonly string[];
  readonly extraConfigs?: readonly FlatConfig[];
  readonly allowConsoleWarnError?: boolean;
}

export interface CreateEslintConfigOptions extends CreateNodeEslintConfigOptions {
  readonly environments?: readonly EslintEnvironment[];
}

export declare const createEslintConfig: (options: CreateEslintConfigOptions) => FlatConfig[];

export declare const createNodeEslintConfig: (options: CreateNodeEslintConfigOptions) => FlatConfig[];

export declare const buildRuleOverrideConfig: (options: RuleOverrideConfigOptions) => FlatConfig;

export declare const buildAllowEmptyInterfaceConfig: (files: readonly string[]) => FlatConfig;

export declare const buildSolidHtmlForCompatConfig: (files: readonly string[]) => FlatConfig;

export declare const buildNoChildrenPropSelectors: (
  entries: readonly NoChildrenPropEntry[],
) => RestrictedSyntaxSelector[];

export declare const buildNoChildrenPropRule: (entries: readonly NoChildrenPropEntry[]) => RestrictedSyntaxRule;

export declare const buildLiteralI18nKeySelectors: (options?: LiteralI18nKeyOptions) => RestrictedSyntaxSelector[];

export declare const buildLiteralI18nKeyRule: (options?: LiteralI18nKeyOptions) => RestrictedSyntaxRule;
