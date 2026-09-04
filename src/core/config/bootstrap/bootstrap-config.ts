import 'server-only';

import { validateBootstrapConfig, type BootstrapConfig } from '@/core/config/bootstrap/bootstrap-schema';

export class RuntimeConfigurationError extends Error {
  readonly issues: readonly { path: string; category: string }[];

  constructor(issues: readonly { path: string; category: string }[]) {
    super(`Runtime configuration is invalid: ${issues.map((issue) => `${issue.path}:${issue.category}`).join(', ')}`);
    this.name = 'RuntimeConfigurationError';
    this.issues = issues;
  }
}

let cachedBootstrap: BootstrapConfig | undefined;

/** Memoized Bootstrap loader: pure validation only, no PostgreSQL/provider clients; secrets pair server-side identifiers at composition. */
export function getBootstrapConfig(): BootstrapConfig {
  if (cachedBootstrap !== undefined) {
    return cachedBootstrap;
  }

  const result = validateBootstrapConfig(process.env);
  if (!result.success) {
    throw new RuntimeConfigurationError(result.issues);
  }

  cachedBootstrap = result.config;
  return cachedBootstrap;
}