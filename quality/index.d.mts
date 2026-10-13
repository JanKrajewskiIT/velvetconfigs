export interface QualityBoundary {
  readonly name: string;
  readonly from: string;
  readonly to: string;
}

export interface QualityPolicy {
  readonly kind: 'browser-library' | 'browser-app' | 'tooling';
  readonly paths: readonly string[];
  readonly tsConfig: string;
  readonly browserPaths?: readonly string[];
  readonly forbidden?: readonly QualityBoundary[];
  readonly duplication?: {
    readonly minTokens?: number;
    readonly minLines?: number;
    readonly maxPercentage?: number;
  };
}

export interface ResolvedQualityPolicy extends Omit<QualityPolicy, 'browserPaths' | 'forbidden' | 'duplication'> {
  readonly browserPaths: readonly string[];
  readonly forbidden: readonly QualityBoundary[];
  readonly duplication: {
    readonly minTokens: number;
    readonly minLines: number;
    readonly maxPercentage: number | undefined;
  };
}

export interface ArchitectureRule {
  readonly name: string;
  readonly severity: 'error';
  readonly from: { readonly path: string };
  readonly to: {
    readonly path?: string;
    readonly circular?: boolean;
    readonly couldNotResolve?: boolean;
    readonly dependencyTypes?: readonly string[];
    readonly dependencyTypesNot?: readonly string[];
  };
}

export interface ArchitectureConfig {
  readonly forbidden: readonly ArchitectureRule[];
  readonly options: {
    readonly doNotFollow: { readonly path: string };
    readonly exclude: { readonly path: string };
    readonly tsPreCompilationDeps: boolean;
    readonly tsConfig: { readonly fileName: string };
    readonly enhancedResolveOptions: {
      readonly exportsFields: readonly string[];
      readonly conditionNames: readonly string[];
    };
  };
}

export interface DuplicationConfig {
  readonly path: readonly string[];
  readonly minTokens: number;
  readonly minLines: number;
  readonly mode: 'mild';
  readonly format: readonly string[];
  readonly ignore: readonly string[];
  readonly reporters: readonly string[];
  readonly silent: boolean;
  readonly absolute: boolean;
}

export declare const readQualityPolicy: (input: QualityPolicy) => ResolvedQualityPolicy;
export declare const createArchitectureConfig: (input: QualityPolicy) => ArchitectureConfig;
export declare const createDuplicationConfig: (input: QualityPolicy) => DuplicationConfig;
