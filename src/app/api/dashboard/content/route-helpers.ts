import { ContentAdminAccessDeniedError } from '@/data/repos/content/admin';

/** Map content-admin failures to stable HTTP status codes. */
export function contentErrorStatus(error: unknown): number {
  return error instanceof ContentAdminAccessDeniedError ? 404 : 500;
}
