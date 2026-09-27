import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { authorized } from '@/app/api/internal/maintenance/view-flush/route';

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const noStore = { 'Cache-Control': 'private, no-store' };
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  try {
    const purged = await runtime.db.execute<{ indicate_private_retention_sweep: number }>(sql`SELECT indicate_private.retention_sweep()`);
    return NextResponse.json({ requestId, purged: purged[0]?.indicate_private_retention_sweep ?? 0 }, { headers: noStore });
  } catch (error) {
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      service: 'indicate-web',
      event: 'retention.sweep.failed',
      requestId,
      error: error instanceof Error ? error.message : 'unknown',
    }));
    return NextResponse.json({ requestId, purged: 0, failed: true }, { status: 503, headers: noStore });
  }
}

/**
 * Compact the operational queues on a schedule.
 *
 * @remarks Without this the invalidation queue and its cache-bypass rows only
 * ever grow: the dispatch worker drains them but nothing removes the finished
 * rows, and each editorial write enqueues one per affected portal. That is what
 * drove the invalidation queue to half a million rows and the database past its
 * size allowance. Audit history is untouched; `audit_logs` is insert-only by
 * design and `retention_sweep` only compacts operational queues.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/retention-sweep', handleGET);

export const maxDuration = 300;
