/** Validate a durable domain-operation attempt identifier. */
export function isPendingAttemptId(value: string | null): boolean {
  return value !== null && /^[a-zA-Z0-9_-]{8,200}$/.test(value);
}
