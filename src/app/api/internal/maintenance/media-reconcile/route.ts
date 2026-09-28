import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { reconcileMediaObjectKeys } from '@/modules/publishing/media-reconciliation';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';

const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
const NOT_FOUND_HEADERS = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } as const;

/**
 * Compare the presented Authorization header against the cron secret.
 *
 * @param request - Incoming maintenance request.
 * @param secret - Expected cron secret from runtime config.
 * @returns True only on an exact Bearer match.
 */
function authorized(request: Request, secret: string): boolean {
  const presented = request.headers.get('authorization');
  const expected = `Bearer ${secret}`;
  if (presented === null || presented.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < presented.length; index += 1) {
    mismatch |= presented.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

/**
 * Bandingkan kunci objek di bucket R2 dengan baris `media`.
 *
 * @param request - Permintaan cron terotorisasi.
 * @returns Rekonsiliasi kunci objek, termasuk drift yang belum pernah terlihat
 * karena tidak ada kueri yang pernah membaca kedua sisi sekaligus.
 * @remarks Hanya melaporkan. Bucket R2 tidak punya versioning objek, jadi penghapusan
 * tetap melewati `object_cleanup_tasks` dan reconciler yang mengklaimnya, bukan dari sini.
 */
async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: NOT_FOUND_HEADERS });
  }
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzlePublishingRepository(runtime.db);
  const storage = new R2ObjectStorageAdapter({
    accountId: context.config.r2.accountId,
    bucketName: context.config.r2.bucketName,
    publicBucketName: context.config.r2.publicBucketName,
    accessKeyId: context.config.r2.accessKeyId,
    secretAccessKey: context.config.r2.secretAccessKey,
  });
  try {
    const report = await reconcileMediaObjectKeys(storage, () => repository.listMediaObjectKeys());
    const byKind: Record<string, { readonly rows: number; readonly bytes: number }> = {};
    for (const entry of report.drift) {
      const current = byKind[entry.kind] ?? { rows: 0, bytes: 0 };
      byKind[entry.kind] = { rows: current.rows + 1, bytes: current.bytes + entry.contentLength };
    }
    logEvent(report.drift.length === 0 ? 'info' : 'warn', {
      event: 'media.key_reconciliation',
      requestId,
      context: { storedObjects: report.storedObjects, trackedKeys: report.trackedKeys, drift: report.drift.length, byKind },
    });
    return NextResponse.json({ requestId, ...report, byKind }, { headers: NO_STORE });
  } catch (error) {
    logEvent('error', { event: 'media.key_reconciliation_failed', requestId, context: { reason: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' } });
    return NextResponse.json({ error: 'media reconciliation failed' }, { status: 503, headers: NO_STORE });
  }
}

export const GET = withApiAccess('GET /api/internal/maintenance/media-reconcile', handleGET);

export const maxDuration = 300;
