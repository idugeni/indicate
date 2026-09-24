import { NextResponse } from 'next/server';

import { trustedCloudflareSource } from '@/modules/integrations/trusted-request-boundary';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createNonDisclosingDenial, type PublicErrorEnvelope } from '@/core/errors';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

/**
 * Maps a webhook envelope to its HTTP status.
 *
 * @param error - Envelope produced by `VercelSpendWebhookService`.
 * @returns Status code defaulting to 404 to avoid leaking endpoint state.
 */
export const status = (error: PublicErrorEnvelope) => error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 404;
async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request); const context = await getServerRuntimeContext(); const config = context.config;
  const sourceIdentity = trustedCloudflareSource(request, config.hosts.webhook, config.cloudflare.originSecret);
  if (sourceIdentity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const production = await createProductionIntegrationsContext();
  const limiter = production.rateLimits;
  const limited = await limiter.enforce(limiter.publicKey('vercel-spend-webhook', sourceIdentity), { ...config.rateLimits.webhook, failureMode: 'closed' }, requestId);
  if (!limited.ok) return NextResponse.json(limited.error, { status: status(limited.error), headers: { 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '1' } });
  const rawBody = await request.text();
  const result = await production.spendWebhooks.process(rawBody, requestId);
  return result.ok ? NextResponse.json({ data: result.value, requestId }) : NextResponse.json(result.error, { status: status(result.error) });
}

export const POST = withApiAccess('POST /api/webhooks/vercel-spend', handlePOST);

export const maxDuration = 30;
