import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { deliveryOperationsComposition } from '@/modules/delivery';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';

/**
 * Compare the presented Authorization header against the cron secret.
 *
 * @param request - Incoming reconcile request.
 * @param secret - Expected cron secret from runtime config.
 * @returns True only on an exact Bearer match (timing-safe).
 */
export function authorized(request: Request, secret: string): boolean {
  const presented = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (presented === null || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

async function runReconcile(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext(); const config = context.config;
  if (!authorized(request, config.security.cronSecret)) return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  const composition = await deliveryOperationsComposition();
  const now = new Date();
  const [activation, invalidation] = await Promise.all([composition.provisioning.reconcile(now), composition.invalidation.dispatch(now, composition.config.publishing.batchSize)]);
  logEvent('info', { event: 'delivery.reconcile', requestId, route: 'GET /api/internal/delivery/reconcile', context: { activation, invalidation } });
  return NextResponse.json({ activation, invalidation }, { headers: { 'Cache-Control': 'private, no-store' } });
}

async function handlePOST(request: Request) {
  return runReconcile(request);
}

async function handleGET(request: Request) {
  return runReconcile(request);
}

export const POST = withApiAccess('POST /api/internal/delivery/reconcile', handlePOST);
/**
 * Menjalankan rekonsiliasi penyaluran.
 *
 * @remarks Vercel Cron hanya mengirim GET (dengan header Authorization Bearer CRON_SECRET otomatis bila env CRON_SECRET tersedia); POST dipertahankan untuk pemicu eksternal.
 */
export const GET = withApiAccess('GET /api/internal/delivery/reconcile', handleGET);
