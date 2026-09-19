import { after, NextResponse } from 'next/server';

import { trustedCloudflareSource } from '@/modules/integrations/trusted-request-boundary';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createNonDisclosingDenial, type PublicErrorEnvelope } from '@/core/errors';
import { logEvent } from '@/core/observability/logger';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

/**
 * Maps a webhook envelope to its HTTP status.
 *
 * @param error - Envelope produced by `TelegramWorkflowService.handle`.
 * @returns Status code defaulting to 404 to avoid leaking linkage state.
 */
export const status = (error: PublicErrorEnvelope) => error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'CONFLICT' ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 404;
async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request); const context = await getServerRuntimeContext(); const config = context.config;
  const source = trustedCloudflareSource(request, config.hosts.webhook, config.cloudflare.originSecret);
  if (source === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const production = await createProductionIntegrationsContext(); const limiter = production.rateLimits;
  const limited = await limiter.enforce(limiter.publicKey('telegram-webhook', source), { ...config.rateLimits.webhook, failureMode: 'closed' }, requestId);
  if (!limited.ok) return NextResponse.json(limited.error, { status: status(limited.error), headers: { 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '1' } });
  const service = production.telegram;
  const claimed = await service.claim(request.headers.get('x-telegram-bot-api-secret-token'), await request.json().catch(() => null), requestId);
  if (claimed.kind === 'rejected') return NextResponse.json(claimed.error, { status: status(claimed.error) });
  if (claimed.kind === 'duplicate') {
    const outcome = await service.handleDuplicate(claimed.claim, claimed.chatId, requestId);
    const result = outcome.result;
    if (outcome.pendingReplies.length > 0) after(() => service.deliverReplies(outcome.pendingReplies, requestId, outcome.identity));
    return result.ok ? NextResponse.json({ ok: true, result: { reply: result.value.reply }, requestId }) : NextResponse.json(result.error, { status: status(result.error) });
  }
  after(() => service.processFresh(claimed.update, claimed.bodyDigest, claimed.claimToken, requestId)
    .then((outcome) => service.deliverReplies(outcome.pendingReplies, requestId, outcome.identity))
    .catch((error: unknown) => logEvent('warn', { event: 'telegram.process.failed', requestId, context: { name: error instanceof Error ? error.name : 'UnknownError' } })));
  return NextResponse.json({ ok: true, requestId });
}

/**
 * Menerima webhook Telegram.
 *
 * @remarks Klaim idempoten berjalan sinkron lalu 200 langsung dikembalikan
 * agar di bawah 100ms dan Telegram tidak retry; eksekusi bisnis + balasan
 * chat berjalan di `after()` karena outcome sudah durable + replayable.
 * Duplikat yang datang saat pemrosesan tetap dijawab 409 agar pengirim
 * mengulang sampai outcome tersedia. Balasan tidak pernah melempar
 * (kegagalan tercatat sebagai warn atau masuk outbox).
 */
export const POST = withApiAccess('POST /api/webhooks/telegram', handlePOST);

export const maxDuration = 60;
