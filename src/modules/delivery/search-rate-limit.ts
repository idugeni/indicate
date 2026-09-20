import 'server-only';

import type { RateLimitPolicy } from '@/modules/integrations/models';
import type { RateLimitService } from '@/modules/integrations/rate-limit-service';

export const SEARCH_RATE_LIMIT_CLASS = 'tenant-search';
export const SEARCH_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS = '60';

export type SearchRateLimiter = Pick<RateLimitService, 'publicKey' | 'enforce'>;

export type SearchThrottle =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: string };

/**
 * Enforce the per-host search rate limit before any search query runs.
 *
 * @param limiter - Rate-limit service (Upstash-backed in production, fake in tests).
 * @param hostname - Classified tenant hostname scoping the limit key.
 * @param policy - Public-read policy from runtime config.
 * @param requestId - Request id carried into denial envelopes.
 * @returns Allowed, or throttled with retry delay; non-limit failures fail open.
 * @remarks Fail-open on Redis outage follows the low-risk public-read fallback: search stays available and crawlers only lose throttling until Redis recovers. Callers must invoke this before `resolveNetworkSite`, never after.
 */
export async function checkSearchRateLimit(
  limiter: SearchRateLimiter,
  params: { readonly hostname: string; readonly policy: Omit<RateLimitPolicy, 'failureMode'>; readonly requestId: string },
): Promise<SearchThrottle> {
  const decision = await limiter.enforce(
    limiter.publicKey(SEARCH_RATE_LIMIT_CLASS, params.hostname),
    { ...params.policy, failureMode: 'closed' },
    params.requestId,
  );
  if (decision.ok) return { allowed: true };
  if (decision.error.error.code !== 'RATE_LIMITED') return { allowed: true };
  return {
    allowed: false,
    retryAfterSeconds:
      decision.error.error.fields?.retryAfterSeconds?.[0] ?? SEARCH_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS,
  };
}
