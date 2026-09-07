import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createRuntimeDatabase } from '@/data/client';
import { Redis } from '@upstash/redis';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

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

interface FlushEntry {
  readonly organizationId: string;
  readonly siteId: string;
  readonly articleSiteId: string;
  readonly count: number;
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const noStore = { 'Cache-Control': 'private, no-store' };
  const runtime = createRuntimeDatabase(context.bootstrap);
  try {
    const redis = new Redis({ url: context.config.redis.url, token: context.config.redis.token });
    const prefix = `pv:${context.bootstrap.environment}:`;
    const deltas = new Map<string, FlushEntry & { count: number }>();
    let cursor = 0;
    do {
      const [next, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 200 });
      cursor = Number(next);
      if (keys.length > 0) {
        const counts = await redis.mget<number[]>(...keys);
        keys.forEach((key, index) => {
          const parts = key.split(':');
          const count = Number(counts[index] ?? 0);
          if (parts.length !== 5 || !Number.isFinite(count) || count <= 0) return;
          const [, , organizationId, siteId, articleSiteId] = parts as [string, string, string, string, string];
          const existing = deltas.get(key);
          deltas.set(key, {
            organizationId: existing?.organizationId ?? organizationId,
            siteId: existing?.siteId ?? siteId,
            articleSiteId: existing?.articleSiteId ?? articleSiteId,
            count: (existing?.count ?? 0) + count,
          });
        });
      }
    } while (cursor !== 0);
    let applied = 0;
    for (const [key, entry] of deltas) {
      try {
        await runtime.db.execute(sql`
          UPDATE article_sites SET view_count = view_count + ${entry.count}, updated_at = now()
          WHERE organization_id = ${entry.organizationId}::uuid
            AND site_id = ${entry.siteId}::uuid AND id = ${entry.articleSiteId}::uuid`);
        await redis.del(key);
        applied += 1;
      } catch {
        /* baris berikutnya; key dipertahankan untuk percobaan berikut */
      }
    }
    return NextResponse.json({ requestId, keys: deltas.size, applied }, { headers: noStore });
  } finally {
    await runtime.close();
  }
}

export const GET = withApiAccess('GET /api/internal/maintenance/view-flush', handleGET);
