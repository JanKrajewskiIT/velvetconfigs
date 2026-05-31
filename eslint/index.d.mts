import type { Linter } from 'eslint';

export type FlatConfig = Linter.Config;

export type EslintEnvironment = 'browser' | 'node' | 'worker' | 'serviceworker' | 'jest' | 'vitest';

export interface CreateEslintConfigOptions {
  tsconfigRootDir: string;
  environments?: readonly EslintEnvironment[];
  typedFiles?: readonly string[];
  testFiles?: readonly string[];
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

export interface RestrictedSyntaxSelector {
  selector: string;
  message: string;
}

export interface LiteralI18nKeyOptions {
  dynamicFunction?: string;
  staticFunction?: string;
}

export type RestrictedSyntaxRule = ['error', ...RestrictedSyntaxSelector[]];

export function createEslintConfig(options: CreateEslintConfigOptions): FlatConfig[];

export function createNodeEslintConfig(options: CreateNodeEslintConfigOptions): FlatConfig[];

export function buildNoChildrenPropSelectors(entries: readonly NoChildrenPropEntry[]): RestrictedSyntaxSelector[];

export function buildNoChildrenPropRule(entries: readonly NoChildrenPropEntry[]): RestrictedSyntaxRule;

export function buildLiteralI18nKeySelectors(options?: LiteralI18nKeyOptions): RestrictedSyntaxSelector[];

export function buildLiteralI18nKeyRule(options?: LiteralI18nKeyOptions): RestrictedSyntaxRule;
