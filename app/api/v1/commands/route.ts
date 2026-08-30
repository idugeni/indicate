import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ApiKeyService } from '@/application/stage6/api-key-service';
import { RateLimitService } from '@/application/stage6/rate-limit-service';
import { trustedCloudflareSource } from '@/application/stage6/trusted-request-boundary';
import { getRuntimeConfig } from '@/config/server';
import { createProductionStage6 } from '@/app/stage6-composition';
import { InMemoryRateLimitAdapter } from '@/infrastructure/testing/rate-limit-memory';
import { getStage6E2eFixture } from '@/app/stage6-test-composition';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';

const schema = z.object({ action: z.enum(['article.create', 'media.reserve', 'publication.request', 'publication.status']), payload: z.unknown() }).strict();
const isE2e = () => process.env.APP_ENVIRONMENT === 'test' && process.env.STAGE2_E2E_MODE === '1';
const rate = new RateLimitService(new InMemoryRateLimitAdapter());
const status = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 409;
const retryHeaders = (error: PublicErrorEnvelope) => ({ 'Retry-After': error.error.fields?.retryAfterSeconds?.[0] ?? '1' });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const config = getRuntimeConfig();
  const source = trustedCloudflareSource(request, config.hosts.api, config.cloudflare.originSecret);
  if (source === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });

  const production = isE2e() ? null : createProductionStage6(config);
  const fixture = isE2e() ? getStage6E2eFixture() : null;
  const repository = fixture?.repository ?? production!.repository;
  const limiter = production?.rateLimits ?? rate;
  const policy = { ...config.rateLimits.mutation, failureMode: 'closed' as const };
  try {
    // This trusted-source bucket is deliberately consumed before JSON parsing, key lookup,
    // or scrypt so unauthenticated CPU and credential-guessing work is bounded.
    const preAuthenticated = await limiter.enforce(limiter.publicKey('api-command-auth', source), policy, requestId);
    if (!preAuthenticated.ok) return NextResponse.json(preAuthenticated.error, { status: status(preAuthenticated.error), headers: retryHeaders(preAuthenticated.error) });

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid API command.', requestId), { status: 400 });
    const bearer = request.headers.get('authorization');
    if (bearer === null || !bearer.startsWith('Bearer ')) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const requiredScope = parsed.data.action.startsWith('article.') ? 'article.manage' : parsed.data.action.startsWith('media.') ? 'media.manage' : parsed.data.action === 'publication.status' ? 'publishing.read' : 'publishing.request';
    const apiKeys = production?.apiKeys ?? new ApiKeyService(repository, new UuidGenerator());
    const authenticated = await apiKeys.authenticate(bearer.slice(7), requiredScope, requestId);
    if (!authenticated.ok) return NextResponse.json(authenticated.error, { status: status(authenticated.error) });

    const limited = await limiter.enforce(limiter.authenticatedKey('api-command', authenticated.value), policy, requestId);
    if (!limited.ok) return NextResponse.json(limited.error, { status: status(limited.error), headers: retryHeaders(limited.error) });
    const shared = (fixture?.sharedFactory ?? production!.sharedFactory).create();
    const actions: Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>> = {
      'article.create': (payload) => shared.articles.createArticle(authenticated.value, payload),
      'media.reserve': (payload) => shared.media.reserveUpload(authenticated.value, payload),
      'publication.request': (payload) => shared.publication.request(authenticated.value, payload),
      'publication.status': (payload) => shared.publication.status(authenticated.value, payload),
    };
    const result = await actions[parsed.data.action]!(parsed.data.payload);
    return result.ok ? NextResponse.json({ data: result.value, requestId }) : NextResponse.json(result.error, { status: status(result.error) });
  } finally { await production?.close(); }
}
