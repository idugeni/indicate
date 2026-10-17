import { safeRedirectPath } from '@/core/security/safe-redirect-path';

/** Resolve a local post-callback URL; reset tokens are handled by Neon Auth before this route. */
export function resolveCallbackDestination(_flow: string | null, next: string | null): string {
  return next === null ? '/dashboard' : safeRedirectPath(next);
}
