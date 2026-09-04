import 'server-only';

/** Deployment envs; unknown values fail parsing before PostgreSQL/provider access. */
export const BOOTSTRAP_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type BootstrapEnvironment = (typeof BOOTSTRAP_ENVIRONMENTS)[number];

export const SCHEMA_GATE_MODES = ['contract', 'live'] as const;

export type SchemaGateMode = (typeof SCHEMA_GATE_MODES)[number];