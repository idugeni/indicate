import { NextResponse } from 'next/server';

import { createProductionIntegrationsContext } from '@/modules/integrations/integrations-composition';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';

/**
 * Compare the presented Authorization header against the cron secret.
 *
 * @param request - Incoming maintenance request.
 * @param secret - Expected cron secret from runtime config.
 * @returns True only on an exact Bearer match.
 */
export function authorized(request: Request, secret: string): boolean {
  const presented = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (presented === null || presented.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < presented.length; index += 1) {
    mismatch |= presented.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const composition = await createProductionIntegrationsContext();
  await composition.telegram.syncBotCommands();
  return NextResponse.json({ requestId, synced: true }, { headers: { 'Cache-Control': 'private, no-store' } });
}

/**
 * Sync the canonical Telegram command menu via Bot API `setMyCommands`.
 *
 * @remarks Cron-guarded like the other maintenance routes; safe to retry.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/telegram-commands', handleGET);

export const maxDuration = 120;
