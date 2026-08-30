import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getRuntimeConfig } from '@/config/server';
import { stage5OperationsComposition } from '../../../../stage5-operations-composition';

function authorized(request: Request, secret: string): boolean {
  const presented = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (presented === null || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
}

export async function POST(request: Request) {
  const config = getRuntimeConfig();
  if (!authorized(request, config.security.cronSecret)) return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  const composition = stage5OperationsComposition();
  try {
    const now = new Date();
    const [activation, invalidation] = await Promise.all([composition.provisioning.reconcile(now), composition.invalidation.dispatch(now, composition.config.publishing.batchSize)]);
    return NextResponse.json({ activation, invalidation }, { headers: { 'Cache-Control': 'private, no-store' } });
  } finally { await composition.runtime.close(); }
}
