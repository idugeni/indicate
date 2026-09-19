import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import type { RateLimitService } from '@/modules/integrations/rate-limit-service';
import { isSecretEqual, trustedCloudflareSource } from '@/modules/integrations/trusted-request-boundary';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { RuntimeConfig } from '@/core/config/runtime/runtime-schema';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

const noStore = { 'Cache-Control': 'no-store, max-age=0' };
const READINESS_RATE_POLICY = Object.freeze({ allowance: 60, windowSeconds: 60, failureMode: 'closed' as const });
type ReadinessLimiter = Pick<RateLimitService, 'publicKey' | 'enforce'>;

/** Atomic deployment challenge: proves the configured secret is accepted and a derived unequal value is rejected. Returns no secret-derived data. */
export async function handleTelegramSecretReadiness(
  request: Request,
  config: RuntimeConfig,
  limiter: ReadinessLimiter,
): Promise<Response> {
  const source = trustedCloudflareSource(request, config.hosts.webhook, config.cloudflare.originSecret);
  if (source === null) return new NextResponse(null, { status: 404, headers: noStore });

  const requestId = resolveRequestId(request);
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
  const accepted = presented !== null && isSecretEqual(presented, config.telegram.webhookSecret);
  const mismatchRejected = !isSecretEqual(mismatch, config.telegram.webhookSecret);
  return new NextResponse(null, { status: accepted && mismatchRejected ? 204 : 404, headers: noStore });
}

export async function handleTelegramSecretReadinessPOST(request: Request) {
  const context = await getServerRuntimeContext(); const config = context.config;
  const production = await createProductionIntegrationsContext();
  return await handleTelegramSecretReadiness(request, config, production.rateLimits);
}

export const POST = withApiAccess('POST /api/webhooks/readiness/telegram-secret', handleTelegramSecretReadinessPOST);

export const maxDuration = 30;
