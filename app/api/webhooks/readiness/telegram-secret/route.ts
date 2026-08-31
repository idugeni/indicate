import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { safeSecretEqual, trustedCloudflareSource } from '@/application/stage6/trusted-request-boundary';
import { createProductionStage6 } from '@/app/stage6-composition';
import { getRuntimeConfig } from '@/config/server';
import type { RuntimeConfig } from '@/config/schema';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';

const e2eRate = new RateLimitService(new InMemoryRateLimitAdapter());
const noStore = { 'Cache-Control': 'no-store, max-age=0' };
const isE2e = () => process.env.APP_ENVIRONMENT === 'test' && process.env.STAGE2_E2E_MODE === '1';
const READINESS_RATE_POLICY = Object.freeze({ allowance: 60, windowSeconds: 60, failureMode: 'closed' as const });
type ReadinessLimiter = Pick<RateLimitService, 'publicKey' | 'enforce'>;

/**
 * One non-mutating, atomic deployment challenge proves both that the configured
 * Telegram secret is accepted and that a deterministic unequal value is
 * rejected by the same constant-time comparator. No secret-derived value is
 * returned, and this dedicated capacity is independent of webhook allowance.
 */
export async function handleTelegramSecretReadiness(
  request: Request,
  config: RuntimeConfig,
  limiter: ReadinessLimiter,
): Promise<Response> {
  const source = trustedCloudflareSource(request, config.hosts.webhook, config.cloudflare.originSecret);
  if (source === null) return new NextResponse(null, { status: 404, headers: noStore });

  const requestId = crypto.randomUUID();
  const limited = await limiter.enforce(
    limiter.publicKey('telegram-readiness', source),
    READINESS_RATE_POLICY,
    requestId,
  );
  if (!limited.ok) {
    const retryAfter = limited.error.error.fields?.retryAfterSeconds?.[0] ?? '1';
    return new NextResponse(null, { status: limited.error.error.code === 'RATE_LIMITED' ? 429 : 503, headers: { ...noStore, 'Retry-After': retryAfter } });
  }

  const presented = request.headers.get('x-telegram-bot-api-secret-token');
  const mismatch = createHash('sha256').update(config.telegram.webhookSecret).digest('base64url');
  const accepted = presented !== null && safeSecretEqual(presented, config.telegram.webhookSecret);
  const mismatchRejected = !safeSecretEqual(mismatch, config.telegram.webhookSecret);
  return new NextResponse(null, { status: accepted && mismatchRejected ? 204 : 404, headers: noStore });
}

export async function POST(request: Request) {
  const config = getRuntimeConfig();
  const production = isE2e() ? null : createProductionStage6(config);
  try {
    return await handleTelegramSecretReadiness(request, config, production?.rateLimits ?? e2eRate);
  } finally {
    await production?.close();
  }
}
