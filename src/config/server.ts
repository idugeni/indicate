import 'server-only';

import { validateRuntimeConfig, type RuntimeConfig } from '@/config/schema';

export class RuntimeConfigurationError extends Error {
  readonly issues: readonly { path: string; category: string }[];

  constructor(issues: readonly { path: string; category: string }[]) {
    super(`Runtime configuration is invalid: ${issues.map((issue) => `${issue.path}:${issue.category}`).join(', ')}`);
    this.name = 'RuntimeConfigurationError';
    this.issues = issues;
  }
}

let cachedConfig: RuntimeConfig | undefined;

export function getRuntimeConfig(): RuntimeConfig {
  if (cachedConfig !== undefined) {
    return cachedConfig;
  }

  const result = validateRuntimeConfig(process.env);
  if (!result.success) {
    throw new RuntimeConfigurationError(result.issues);
  }

  cachedConfig = result.config;
  return cachedConfig;
}
