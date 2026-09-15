import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { RateLimitService } from '@/modules/integrations/rate-limit-service';
import { trustedCloudflareSource } from '@/modules/integrations/trusted-request-boundary';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const schema = z.object({ action: z.enum(['article.create', 'media.reserve', 'publication.request', 'publication.requestBulk', 'publication.suggest', 'publication.retry', 'publication.unpublish', 'publication.status']), payload: z.unknown() }).strict();
const status = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 409;
const retryHeaders = (error: PublicErrorEnvelope) => ({ 'Retry-After': error.error.fields?.retryAfterSeconds?.[0] ?? '1' });

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext(); const config = context.config;
  const source = trustedCloudflareSource(request, config.hosts.api, config.cloudflare.originSecret);
  if (source === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });

  const production = await createProductionIntegrationsContext();
  const limiter: RateLimitService = production.rateLimits;
  const policy = { ...config.rateLimits.mutation, failureMode: 'closed' as const };
  // Consume the trusted-source bucket before parsing/auth so unauthenticated CPU work stays bounded.
  const preAuthenticated = await limiter.enforce(limiter.publicKey('api-command-auth', source), policy, requestId);
  if (!preAuthenticated.ok) return NextResponse.json(preAuthenticated.error, { status: status(preAuthenticated.error), headers: retryHeaders(preAuthenticated.error) });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid API command.', requestId), { status: 400 });
  const bearer = request.headers.get('authorization');
  if (bearer === null || !bearer.startsWith('Bearer ')) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const requiredScope = parsed.data.action.startsWith('article.') ? 'article.manage' : parsed.data.action.startsWith('media.') ? 'media.manage' : parsed.data.action === 'publication.status' ? 'publishing.read' : 'publishing.request';
  const apiKeys = production.apiKeys;
  const authenticated = await apiKeys.authenticate(bearer.slice(7), requiredScope, requestId);
  if (!authenticated.ok) return NextResponse.json(authenticated.error, { status: status(authenticated.error) });

  const limited = await limiter.enforce(limiter.authenticatedKey('api-command', authenticated.value), policy, requestId);
  if (!limited.ok) return NextResponse.json(limited.error, { status: status(limited.error), headers: retryHeaders(limited.error) });
  const shared = production.sharedFactory.create();
  const actions: Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>> = {
    'article.create': (payload) => shared.articles.createArticle(authenticated.value, payload),
    'media.reserve': (payload) => shared.media.reserveUpload(authenticated.value, payload),
    'publication.request': (payload) => shared.publication.request(authenticated.value, payload),
    'publication.requestBulk': (payload) => shared.publication.requestBulk(authenticated.value, payload),
    'publication.suggest': (payload) => shared.publication.suggest(authenticated.value, payload),
    'publication.retry': (payload) => shared.publication.retry(authenticated.value, payload),
    'publication.unpublish': (payload) => shared.publication.unpublish(authenticated.value, payload),
    'publication.status': (payload) => shared.publication.status(authenticated.value, payload),
  };
  const result = await actions[parsed.data.action]!(parsed.data.payload);
  return result.ok ? NextResponse.json({ data: result.value, requestId }) : NextResponse.json(result.error, { status: status(result.error) });
}

export const POST = withApiAccess('POST /api/v1/commands', handlePOST);
