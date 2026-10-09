import { createPublicError, type PublicErrorEnvelope } from '@/core/errors';

/** Map report intake outcomes to public HTTP status codes. */
export function reportOutcomeStatus(code: string): number {
  if (code === 'INVALID_INPUT') return 400;
  if (code === 'DEPENDENCY_UNAVAILABLE') return 503;
  return 404;
}

/** Map a security challenge denial to its public error and status. */
export function reportChallengeDenial(outcome: 'rejected' | 'unavailable', requestId: string): { readonly error: PublicErrorEnvelope; readonly status: number } {
  if (outcome === 'rejected') {
    return { error: createPublicError('FORBIDDEN', 'Security verification failed. Please try again.', requestId), status: 403 };
  }
  return { error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Report intake is temporarily unavailable.', requestId), status: 503 };
}
