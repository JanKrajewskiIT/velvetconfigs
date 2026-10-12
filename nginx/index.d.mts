export interface SpaNginxOptions {
  readonly connectSources?: readonly string[];
  readonly frameSources?: readonly string[];
  readonly frameAncestors?: readonly string[];
  /** Required by Solid's dynamic style attributes and Recron's print document styles. */
  readonly allowInlineStyles?: boolean;
  readonly allowRemoteImages?: boolean;
  /** Enables local audio/video blobs, including fetches needed for decoding. */
  readonly allowBlobMedia?: boolean;
  readonly allowLoopbackHttp?: boolean;
}
export declare const createSpaNginxConfig: (options?: SpaNginxOptions) => string;
export interface SpaArtifactConfig {
  readonly nginx: string;
  readonly publicAsset?: string;
}
