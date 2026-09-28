import 'server-only';

import type { RateLimitPolicy } from '@/modules/integrations/models';
import type { RateLimitService } from '@/modules/integrations/rate-limit-service';

export const REPORT_RATE_LIMIT_CLASS = 'content-report';
export const REPORT_IP_RATE_LIMIT_CLASS = 'content-report-ip';
export const REPORT_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS = '60';

/**
 * Per-client-IP ceiling on report intake.
 *
 * The per-host bucket alone lets one caller exhaust a tenant's whole allowance
 * and lock out every legitimate complainant for the window, so this second
 * bucket is the one that actually bounds abuse. It stays deliberately loose
 * enough for shared egress (office NAT, carrier CGNAT) to submit a report
 * without colliding.
 */
export const REPORT_IP_POLICY: Readonly<Omit<RateLimitPolicy, 'failureMode'>> = Object.freeze({
  allowance: 20,
  windowSeconds: 300,
});

export type ReportRateLimiter = Pick<RateLimitService, 'publicKey' | 'enforce'>;

export type ReportThrottle =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly retryAfterSeconds: string };

interface ReportRateLimitBucket {
  readonly endpointClass: string;
  readonly source: string;
  readonly policy: Omit<RateLimitPolicy, 'failureMode'>;
}

/**
 * Enforce the per-host and per-IP report intake limits before any body is read.
 *
 * @param limiter - Rate-limit service (Upstash-backed in production, fake in tests).
 * @param params.hostname - Classified tenant hostname scoping the shared bucket.
 * @param params.clientIp - Edge-provided client IP, or null when Cloudflare supplied none.
 * @param params.hostPolicy - Public-read policy from runtime config.
 * @param params.requestId - Request id carried into denial envelopes.
 * @returns Allowed, or throttled with a retry delay.
 * @remarks Both buckets are `closed`: when Redis is unreachable the request is
 * rejected rather than admitted, because an unbounded intake is worse than a
 * briefly unavailable one on a channel the platform owes its users. A missing
 * client IP keeps the per-host bucket as the only guard instead of inventing a
 * shared key, so direct (non-edge) access degrades rather than fails.
 */
export async function enforceReportIntakeThrottle(
  limiter: ReportRateLimiter,
  params: {
    readonly hostname: string;
    readonly clientIp: string | null;
    readonly hostPolicy: Omit<RateLimitPolicy, 'failureMode'>;
    readonly requestId: string;
  },
): Promise<ReportThrottle> {
  const buckets: readonly ReportRateLimitBucket[] = [
    { endpointClass: REPORT_RATE_LIMIT_CLASS, source: params.hostname, policy: params.hostPolicy },
    ...(params.clientIp === null
      ? []
      : [
          {
            endpointClass: REPORT_IP_RATE_LIMIT_CLASS,
            source: `${params.hostname}|${params.clientIp}`,
            policy: REPORT_IP_POLICY,
          } satisfies ReportRateLimitBucket,
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
        retryAfterSeconds: decision.error.error.fields?.retryAfterSeconds?.[0] ?? REPORT_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS,
      };
    }
    return { allowed: false, retryAfterSeconds: REPORT_RATE_LIMIT_FALLBACK_RETRY_AFTER_SECONDS };
  }
  return { allowed: true };
}
