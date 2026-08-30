export interface SchemaVersionPort {
  readCurrentVersion(): Promise<number | null>;
}

export interface SchemaGateResult {
  readonly ready: boolean;
  readonly requiredVersion: number;
  readonly actualVersion: number | null;
}
