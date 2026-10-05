import 'server-only';

import type { RateLimitPolicy } from '@/modules/integrations/models';
import type { RateLimitService } from '@/modules/integrations/rate-limit-service';

export const NEWSLETTER_RATE_LIMIT_CLASS = 'newsletter-subscribe';
export const NEWSLETTER_IP_RATE_LIMIT_CLASS = 'newsletter-subscribe-ip';
export const NEWSLETTER_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS = '60';

/**
 * Per-client-IP ceiling on newsletter subscriptions.
 *
 * Each admitted request sends a confirmation email, so this bucket is the one
 * that actually bounds provider cost and third-party address abuse. It stays
 * deliberately tight: legitimate readers subscribe once per portal.
 */
export const NEWSLETTER_IP_POLICY: Readonly<Omit<RateLimitPolicy, 'failureMode'>> = Object.freeze({
  allowance: 10,
  windowSeconds: 300,
});

export type NewsletterRateLimiter = Pick<RateLimitService, 'publicKey' | 'enforce'>;

export type NewsletterThrottle =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: string };

interface NewsletterRateLimitBucket {
  readonly endpointClass: string;
  readonly source: string;
  readonly policy: Omit<RateLimitPolicy, 'failureMode'>;
}

/**
 * Enforce the per-host and per-IP newsletter subscription limits before any body is read.
 *
 * @param limiter - Rate-limit service (Upstash-backed in production, fake in tests).
 * @param params.hostname - Classified tenant hostname scoping the shared bucket.
 * @param params.clientIp - Edge-provided client IP, or null when Cloudflare supplied none.
 * @param params.hostPolicy - Public-read policy from runtime config.
 * @param params.requestId - Request id carried into denial envelopes.
 * @returns Allowed, or throttled with a retry delay.
 * @remarks Both buckets are `closed`: when Redis is unreachable the request is
 * rejected rather than admitted, because an unbounded intake is worse than a
 * briefly unavailable one on a channel that spends provider budget per hit.
 */
export async function enforceNewsletterThrottle(
  limiter: NewsletterRateLimiter,
  params: {
    readonly hostname: string;
    readonly clientIp: string | null;
    readonly hostPolicy: Omit<RateLimitPolicy, 'failureMode'>;
    readonly requestId: string;
  },
): Promise<NewsletterThrottle> {
  const buckets: readonly NewsletterRateLimitBucket[] = [
    { endpointClass: NEWSLETTER_RATE_LIMIT_CLASS, source: params.hostname, policy: params.hostPolicy },
    ...(params.clientIp === null
      ? []
      : [
          {
            endpointClass: NEWSLETTER_IP_RATE_LIMIT_CLASS,
            source: `${params.hostname}|${params.clientIp}`,
            policy: NEWSLETTER_IP_POLICY,
          } satisfies NewsletterRateLimitBucket,
        ]),
  ];
  for (const bucket of buckets) {
    const decision = await limiter.enforce(
      limiter.publicKey(bucket.endpointClass, bucket.source),
      { ...bucket.policy, failureMode: 'closed' },
      params.requestId,
    );
    if (decision.ok) continue;
    if (decision.error.error.code === 'RATE_LIMITED') {
      return {
        allowed: false,
        retryAfterSeconds: decision.error.error.fields?.retryAfterSeconds?.[0] ?? NEWSLETTER_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS,
      };
    }
    return { allowed: false, retryAfterSeconds: NEWSLETTER_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS };
  }
  return { allowed: true };
}
