import { NextResponse } from 'next/server';

import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { trustedCloudflareSource } from '@/application/stage6/trusted-request-boundary';
import { WebhookService } from '@/application/stage6/webhook-service';
import { createProductionStage6 } from '@/app/stage6-composition';
import { getRuntimeConfig } from '@/config/server';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';
import { getStage6E2eFixture } from '@/app/stage6-test-composition';
import { createNonDisclosingDenial, type PublicErrorEnvelope } from '@/shared/errors/application-error';

const e2eRate = new RateLimitService(new InMemoryRateLimitAdapter());
const isE2e = () => process.env.APP_ENVIRONMENT === 'test' && process.env.STAGE2_E2E_MODE === '1';
const status = (error: PublicErrorEnvelope) => error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 404;
export async function POST(request: Request) {
  const requestId = crypto.randomUUID(); const config = getRuntimeConfig();
  const sourceIdentity = trustedCloudflareSource(request, config.hosts.webhook, config.cloudflare.originSecret);
  if (sourceIdentity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const production = isE2e() ? null : createProductionStage6(config); const fixture = isE2e() ? getStage6E2eFixture() : null;
  try {
    const limiter = production?.rateLimits ?? e2eRate;
    const limited = await limiter.enforce(limiter.publicKey('generic-webhook', sourceIdentity), { ...config.rateLimits.webhook, failureMode: 'closed' }, requestId);
    if (!limited.ok) return NextResponse.json(limited.error, { status: status(limited.error), headers: { 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '1' } });
    const service = production?.webhooks ?? new WebhookService(fixture!.repository, { generic: config.security.genericWebhookSecret }, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds);
    const rawBody = await request.text();
    const result = await service.process(rawBody, {
      source: request.headers.get('x-indicate-webhook-source'), replayId: request.headers.get('x-indicate-replay-id'),
      timestamp: request.headers.get('x-indicate-timestamp'), signature: request.headers.get('x-indicate-signature'),
    }, null, requestId);
    return result.ok ? NextResponse.json({ data: result.value, requestId }) : NextResponse.json(result.error, { status: status(result.error) });
  } finally { await production?.close(); }
}
