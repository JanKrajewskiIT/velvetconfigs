import type { Linter } from 'eslint';

export type FlatConfig = Linter.Config;
export type EslintEnvironment = 'browser' | 'node' | 'worker' | 'serviceworker' | 'jest' | 'vitest';

export interface CreateEslintConfigOptions {
  tsconfigRootDir: string;
  typedFiles?: readonly string[];
  testFiles?: readonly string[];
  environments?: readonly EslintEnvironment[];
  ignorePaths?: readonly string[];
  extraConfigs?: readonly FlatConfig[];
  allowConsoleWarnError?: boolean;
}

export interface CreateNodeEslintConfigOptions {
  tsconfigRootDir: string;
  typedFiles?: readonly string[];
  testFiles?: readonly string[];
  ignorePaths?: readonly string[];
  extraConfigs?: readonly FlatConfig[];
  allowConsoleWarnError?: boolean;
}

export interface NoChildrenPropEntry {
  component: string;
  prop: string;
  forbid: readonly string[];
}

export interface LiteralI18nKeyOptions {
  dynamicFunction?: string;
  staticFunction?: string;
}

export interface RestrictedSyntaxSelector {
  selector: string;
  message: string;
}

export type RestrictedSyntaxRule = Linter.RuleEntry;

export declare const createEslintConfig: (options: CreateEslintConfigOptions) => FlatConfig[];
export declare const createNodeEslintConfig: (options: CreateNodeEslintConfigOptions) => FlatConfig[];
export declare const buildNoChildrenPropSelectors: (
  entries: readonly NoChildrenPropEntry[],
) => RestrictedSyntaxSelector[];
export declare const buildNoChildrenPropRule: (entries: readonly NoChildrenPropEntry[]) => RestrictedSyntaxRule;
export declare const buildLiteralI18nKeySelectors: (options?: LiteralI18nKeyOptions) => RestrictedSyntaxSelector[];
export declare const buildLiteralI18nKeyRule: (options?: LiteralI18nKeyOptions) => RestrictedSyntaxRule;
