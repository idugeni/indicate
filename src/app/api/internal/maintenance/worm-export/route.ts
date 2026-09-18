import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { exportDailyAudit } from '@/modules/audit/audit-worm-export';
import { withApiAccess } from '@/core/observability/api-access';
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
    accessKeyId: audit.accessKeyId,
    secretAccessKey: audit.secretAccessKey,
  });
  try {
    const summary = await exportDailyAudit({ db: runtime.db, storage, now: new Date() });
    return NextResponse.json({ requestId, ...summary }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'audit export failed' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

export const GET = withApiAccess('GET /api/internal/maintenance/worm-export', handleGET);
