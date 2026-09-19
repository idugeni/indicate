import { NextResponse } from 'next/server';

import { createProductionIntegrationsContext } from '@/modules/integrations/integrations-composition';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { resolveRequestId } from '@/core/observability/request-id';
import { authorizeMiniAppOwner, type MiniAppOwnerContext } from '@/modules/integrations/telegram-miniapp-auth';
import type { PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

type MiniAppComposition = Awaited<ReturnType<typeof createProductionIntegrationsContext>>;

export interface MiniAppGate {
  readonly context: MiniAppOwnerContext;
  readonly composition: MiniAppComposition;
}

/**
 * Maps a service envelope to its HTTP status without leaking internals.
 *
 * @param error - Envelope produced by a business service.
 * @returns Status code defaulting to 404 to avoid leaking linkage state.
 */
export const miniAppErrorStatus = (error: PublicErrorEnvelope): number =>
  error.error.code === 'INVALID_INPUT'
    ? 400
    : error.error.code === 'RATE_LIMITED'
      ? 429
      : error.error.code === 'CONFLICT'
        ? 409
        : error.error.code === 'DEPENDENCY_UNAVAILABLE'
          ? 503
          : 404;

export function miniAppErrorResponse(error: PublicErrorEnvelope): NextResponse {
  return NextResponse.json(error, { status: miniAppErrorStatus(error), headers: { 'Cache-Control': 'private, no-store' } });
}

/**
 * Authenticates an owner-only Mini App request end to end.
 *
 * @param request - Incoming POST request (used for the request ID only).
 * @param body - Parsed JSON body carrying init data and target organization.
 * @returns Owner context plus composition, or an HTTP response to return.
 * @remarks
 * Validates init data authenticity and freshness, enforces the owner
 * allowlist, then rate-limits per Telegram user. No mapping is required:
 * ownership alone scopes the actor.
 */
export async function requireMiniAppOwner(
  request: Request,
  body: { readonly initData?: unknown; readonly organizationId?: unknown },
): Promise<Result<MiniAppGate, NextResponse>> {
  const requestId = resolveRequestId(request);
  if (typeof body.initData !== 'string' || typeof body.organizationId !== 'string') {
    return {
      ok: false as const,
      error: NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' }, requestId }, { status: 400 }),
    };
  }
  const runtime = await getServerRuntimeContext();
  const gate = authorizeMiniAppOwner({
    botToken: runtime.config.telegram.botToken,
    ownerIds: runtime.config.telegram.ownerIds,
    initData: body.initData,
    organizationId: body.organizationId,
    requestId,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (!gate.ok) {
    return { ok: false as const, error: miniAppErrorResponse(gate.error) };
  }
  const composition = await createProductionIntegrationsContext();
  const limited = await composition.rateLimits.enforce(
    composition.rateLimits.publicKey('miniapp', gate.value.telegramUserId),
    { ...runtime.config.rateLimits.webhook, failureMode: 'closed' },
    requestId,
  );
  if (!limited.ok) {
    return {
      ok: false as const,
      error: NextResponse.json(limited.error, {
        status: miniAppErrorStatus(limited.error),
        headers: { 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '1', 'Cache-Control': 'private, no-store' },
      }),
    };
  }
  return { ok: true as const, value: { context: gate.value, composition } };
}
