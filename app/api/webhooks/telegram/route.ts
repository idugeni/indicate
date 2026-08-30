import { NextResponse } from 'next/server';

import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { TelegramWorkflowService } from '@/application/stage6/telegram-workflow-service';
import { trustedCloudflareSource } from '@/application/stage6/trusted-request-boundary';
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
  const source = trustedCloudflareSource(request, config.hosts.webhook, config.cloudflare.originSecret);
  if (source === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const production = isE2e() ? null : createProductionStage6(config); const fixture = isE2e() ? getStage6E2eFixture() : null; const limiter = production?.rateLimits ?? e2eRate;
  try {
    const limited = await limiter.enforce(limiter.publicKey('telegram-webhook', source), { ...config.rateLimits.webhook, failureMode: 'closed' }, requestId);
    if (!limited.ok) return NextResponse.json(limited.error, { status: status(limited.error), headers: { 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '1' } });
    const service = production?.telegram ?? new TelegramWorkflowService(fixture!.repository, fixture!.sharedFactory, fixture!.telegram, fixture!.telegram, config.telegram.webhookSecret, config.security.webhookFreshnessSeconds, config.security.webhookReplayTtlSeconds);
    const result = await service.handle(request.headers.get('x-telegram-bot-api-secret-token'), await request.json().catch(() => null), requestId);
    return result.ok ? NextResponse.json({ ok: true, result: { reply: result.value.reply }, requestId }) : NextResponse.json(result.error, { status: status(result.error) });
  } finally { await production?.close(); }
}
