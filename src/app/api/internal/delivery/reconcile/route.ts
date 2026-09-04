import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { deliveryOperationsComposition } from '@/modules/delivery';
import { withApiAccess } from '@/core/observability/api-access';

function authorized(request: Request, secret: string): boolean {
  const presented = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (presented === null || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

async function handlePOST(request: Request) {
  const context = await getServerRuntimeContext(); const config = context.config;
  if (!authorized(request, config.security.cronSecret)) return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  const composition = await deliveryOperationsComposition();
  try {
    const now = new Date();
    const [activation, invalidation] = await Promise.all([composition.provisioning.reconcile(now), composition.invalidation.dispatch(now, composition.config.publishing.batchSize)]);
    return NextResponse.json({ activation, invalidation }, { headers: { 'Cache-Control': 'private, no-store' } });
  } finally { await composition.runtime.close(); }
}

export const POST = withApiAccess('POST /api/internal/delivery/reconcile', handlePOST);
