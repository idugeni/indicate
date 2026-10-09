import { safeRedirectPath } from '@/core/security/safe-redirect-path';

/** Resolve the post-sign-out redirect target, defaulting to sign-in. */
export function resolveSignOutDestination(rawNext: string | null): string {
  return rawNext === null ? '/sign-in' : safeRedirectPath(rawNext);
}
