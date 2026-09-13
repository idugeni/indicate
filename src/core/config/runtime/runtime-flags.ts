import 'server-only';

/** Server-only env predicates; no secrets here — credential validation lives in `schema.ts`. */

export function getAppEnvironment(): string {
  return 'production';
}

export function isProductionServer(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.NODE_ENV === 'production';
}

export function isObservabilityDebugEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.OBSERVABILITY_DEBUG === '1';
}
