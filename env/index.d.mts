export type EnvKind = 'string' | 'url';
export type EnvSchema = Readonly<Record<string, EnvKind>>;
export interface ValidateEnvOptions {
  readonly httpsOnly?: boolean;
  readonly allowLoopbackHttp?: boolean;
}
export declare const validateEnv: <const Schema extends EnvSchema>(
  values: Readonly<Record<string, string | undefined>>,
  schema: Schema,
  options?: ValidateEnvOptions,
) => { readonly [Key in keyof Schema]: string };
