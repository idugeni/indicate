import { RuntimeConfigAdminAccessDeniedError, RuntimeConfigAdminConflictError } from '@/data/repos/runtime-config/admin';

/** Maps runtime-config repository failures to stable HTTP status codes. */
export function runtimeConfigErrorStatus(error: unknown): number {
  if (error instanceof RuntimeConfigAdminAccessDeniedError) return 404;
  if (error instanceof RuntimeConfigAdminConflictError) return 409;
  return 500;
}
