import 'server-only';

import { RuntimeConfigurationError } from '@/core/config/bootstrap/bootstrap-config';
import { validateRuntimeConfig, type RuntimeConfig } from '@/core/config/runtime/runtime-schema';

let cachedConfig: RuntimeConfig | undefined;

/** Legacy env-derived config for the cutover window; after cutover use `getServerRuntimeContext()`, kept only for the parity reader. */
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