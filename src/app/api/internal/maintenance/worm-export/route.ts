import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { exportDailyAudit, WormExportDateError } from '@/modules/audit/audit-worm-export';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';

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

/**
 * Ekspor satu hari jejak audit ke bucket WORM.
 *
 * @param request - Permintaan cron terotorisasi; `?date=YYYY-MM-DD` memilih hari yang akan diisi ulang.
 * @returns Ringkasan hari yang diekspor, 400 untuk tanggal tidak valid, 503 bila bucket audit tidak dikonfigurasi.
 * @remarks Tanpa `?date=` route mengekspor HARI KEMARIN, jadi jadwal harian dan backfill memakai
 * permukaan yang sama. Bucket terkunci `worm-indefinite` dan `exportDailyAudit` melewati berkas yang
 * sudah ada: mengisi hari yang terlewat harus menyebut tanggalnya secara eksplisit, tidak bisa diulang.
 */
async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const audit = context.config.r2.audit;
  if (audit === null) {
    return NextResponse.json({ error: 'audit export not configured' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const storage = new R2ObjectStorageAdapter({
    accountId: context.config.r2.accountId,
    bucketName: audit.bucketName,
    publicBucketName: null,
    accessKeyId: audit.accessKeyId,
    secretAccessKey: audit.secretAccessKey,
  });
  try {
    const day = new URL(request.url).searchParams.get('date');
    const summary = await exportDailyAudit({ db: runtime.db, storage, now: new Date(), day });
    return NextResponse.json({ requestId, ...summary }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof WormExportDateError) return NextResponse.json({ error: 'invalid export date' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    /**
     * The reason stays in the log, not the response.
     *
     * @remarks The bare `audit export failed` body is what made a fifteen-day
     * outage un diagnosable: the body is identical whether the bucket is
     * unconfigured, the object lock refused an overwrite, or the database read
     * failed, and a cron has no reader to ask. The response keeps its fixed
     * shape; the log carries the cause for whoever reads the function log.
     */
    logEvent('error', { event: 'audit.worm_export_failed', requestId, context: { reason: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' } });
    return NextResponse.json({ error: 'audit export failed' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

export const GET = withApiAccess('GET /api/internal/maintenance/worm-export', handleGET);

export const maxDuration = 300;
