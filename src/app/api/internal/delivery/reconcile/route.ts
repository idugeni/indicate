import { NextResponse } from 'next/server';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { deliveryOperationsComposition } from '@/modules/delivery';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { authorized } from '@/app/api/internal/auth';

async function runReconcile(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext(); const config = context.config;
  if (!authorized(request, config.security.cronSecret)) return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  const scope = new URL(request.url).searchParams.get('scope') ?? 'all';
  if (scope !== 'invalidation' && scope !== 'provisioning' && scope !== 'all') return NextResponse.json({ error: 'INVALID_SCOPE' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  const composition = await deliveryOperationsComposition();
  const now = new Date();
  if (scope === 'invalidation') {
    const invalidation = await composition.invalidation.dispatch(now, composition.config.publishing.batchSize);
    logEvent('info', { event: 'delivery.reconcile', requestId, route: 'GET /api/internal/delivery/reconcile', context: { scope, invalidation } });
    return NextResponse.json({ invalidation }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (scope === 'provisioning') {
    const activation = await composition.provisioning.reconcile(now);
    logEvent('info', { event: 'delivery.reconcile', requestId, route: 'GET /api/internal/delivery/reconcile', context: { scope, activation } });
    return NextResponse.json({ activation }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const [activation, invalidation] = await Promise.all([composition.provisioning.reconcile(now), composition.invalidation.dispatch(now, composition.config.publishing.batchSize)]);
  logEvent('info', { event: 'delivery.reconcile', requestId, route: 'GET /api/internal/delivery/reconcile', context: { scope, activation, invalidation } });
  return NextResponse.json({ activation, invalidation }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function handleGET(request: Request) {
  return runReconcile(request);
}

/**
 * Run delivery reconciliation.
 *
 * @remarks Cron-only surface: Vercel Cron sends GET with an automatic
 * Authorization Bearer CRON_SECRET header when the CRON_SECRET env is available.
 */
export const GET = withApiAccess('GET /api/internal/delivery/reconcile', handleGET);

export const maxDuration = 180;
