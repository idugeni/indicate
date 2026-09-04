import 'server-only';

/** Server-only env predicates; no secrets here — credential validation lives in `schema.ts`. */

export function getAppEnvironment(environment: NodeJS.ProcessEnv = process.env): string {
  return environment.APP_ENVIRONMENT ?? 'development';
}

export function isProductionServer(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.NODE_ENV === 'production';
}

export function isObservabilityDebugEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.OBSERVABILITY_DEBUG === '1';
}
