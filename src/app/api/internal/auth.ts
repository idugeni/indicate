import { timingSafeEqual } from 'node:crypto';

/**
 * Compare the presented Authorization header against the cron secret.
 *
 * @param request - Incoming internal request.
 * @param secret - Expected cron secret from runtime config.
 * @returns True only on an exact Bearer match (timing-safe).
 */
export function authorized(request: Request, secret: string): boolean {
  return matchesSecret(request.headers.get('authorization'), secret);
}

/**
 * Compare a raw Authorization header value against the expected secret.
 *
 * @param value - Raw Authorization header value.
 * @param expected - Expected secret without the Bearer prefix.
 * @returns True only on an exact Bearer match (timing-safe).
 */
export function matchesSecret(value: string | null, expected: string): boolean {
  if (value === null || !value.startsWith('Bearer ')) return false;
  const actual = Buffer.from(value.slice('Bearer '.length));
  const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}
