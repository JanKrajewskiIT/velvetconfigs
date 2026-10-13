export interface PreloadRecoveryOptions {
  readonly onUpdateAvailable: (reload: () => boolean) => void;
  readonly canReload?: () => boolean;
  readonly onBlocked?: () => void;
}
declare global {
  const __VELVET_APP_VERSION__: string;
}
export interface WebVitalMetric {
  readonly name: 'LCP' | 'INP' | 'CLS';
  readonly value: number;
  readonly rating: 'good' | 'needs-improvement' | 'poor';
}
export type BrowserErrorKind = 'render' | 'bootstrap' | 'chunk' | 'storage' | 'async';
export type BrowserDiagnostic = Readonly<
  { app: string; version: string; timestamp: number } & (
    { type: 'error'; kind: BrowserErrorKind } | ({ type: 'metric' } & WebVitalMetric)
  )
>;
export interface BrowserDiagnosticsOptions {
  readonly app: string;
  readonly version: string;
  readonly onReport?: (report: BrowserDiagnostic) => void;
}
export interface BrowserDiagnostics {
  readonly reportError: (kind?: BrowserErrorKind) => void;
  readonly reportMetric: (metric: WebVitalMetric) => void;
  readonly getReports: () => BrowserDiagnostic[];
}
export declare const installPreloadRecovery: (options: PreloadRecoveryOptions) => () => void;
export declare const createBrowserDiagnostics: (options: BrowserDiagnosticsOptions) => BrowserDiagnostics;
export declare const observeWebVitals: (onMetric: (metric: WebVitalMetric) => void) => Promise<() => void>;
export declare const observeAsyncErrors: (onError: () => void) => () => void;
