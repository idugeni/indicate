const PENDING_ATTEMPT_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

/** Check whether a pending-activation attempt id is a well-formed UUID. */
export function isPendingAttemptId(value: string | null): boolean {
  return value !== null && PENDING_ATTEMPT_PATTERN.test(value);
}
