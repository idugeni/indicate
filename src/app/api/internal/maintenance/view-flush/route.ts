import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { parsePageviewKey } from '@/modules/site/pageview-contract';
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

function auditFlushIssue(requestId: string, event: string, fields: Readonly<Record<string, unknown>>): void {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    service: 'indicate-web',
    event,
    requestId,
    ...fields,
  }));
}

interface FlushEntry {
  readonly organizationId: string;
  readonly siteId: string;
  readonly articleSiteId: string;
  readonly count: number;
}

const MAX_FLUSH_KEYS = 5000;
const UPDATE_CHUNK_SIZE = 500;
const DEL_CHUNK_SIZE = 500;

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const noStore = { 'Cache-Control': 'private, no-store' };
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  {
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
          const identity = parsePageviewKey(key);
          const count = Number(counts[index] ?? 0);
          if (identity === null || !Number.isFinite(count) || count <= 0) return;
          const { organizationId, siteId, articleSiteId } = identity;
          const existing = deltas.get(key);
          deltas.set(key, {
            organizationId: existing?.organizationId ?? organizationId,
            siteId: existing?.siteId ?? siteId,
            articleSiteId: existing?.articleSiteId ?? articleSiteId,
            count: (existing?.count ?? 0) + count,
          });
        });
      }
      if (deltas.size >= MAX_FLUSH_KEYS) break;
    } while (cursor !== 0);
    // Sesi pooled membawa GUC tenant/region request sebelumnya: set_tenant_context
    // menolak org berbeda (conflict) dan region basi menyaring baris keluar,
    // keduanya diam-diam menggugurkan flush. RESET dulu per org di dalam satu
    // transaksi (satu koneksi terjepit), lalu tegakkan konteks flush yang bersih.
    const byOrg = new Map<string, { key: string; entry: FlushEntry & { count: number } }[]>();
    for (const [key, entry] of deltas) {
      const list = byOrg.get(entry.organizationId) ?? [];
      list.push({ key, entry });
      byOrg.set(entry.organizationId, list);
    }
    let applied = 0;
    let skipped = 0;
    let orphans = 0;
    const appliedKeys: string[] = [];
    const orphanKeys: string[] = [];
    for (const [organizationId, rows] of byOrg) {
      try {
        await runtime.db.transaction(async (transaction) => {
          await transaction.execute(sql`RESET app.organization_id`);
          await transaction.execute(sql`RESET app.region_id`);
          await transaction.execute(sql`RESET app.actor_id`);
          await transaction.execute(sql`RESET app.request_id`);
          await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${'system:view-flush'}, ${requestId})`);
          await transaction.execute(sql`SELECT indicate_private.set_region_context(NULL::uuid)`);
          const pending = new Map<string, { key: string; entry: FlushEntry & { count: number } }>(
            rows.map(({ key, entry }) => [entry.articleSiteId, { key, entry }] as const),
          );
          for (let index = 0; index < rows.length; index += UPDATE_CHUNK_SIZE) {
            const chunk = rows.slice(index, index + UPDATE_CHUNK_SIZE);
            const values = sql.join(
              chunk.map(({ entry }) => sql`(${entry.articleSiteId}::uuid, ${entry.siteId}::uuid, ${entry.count}::int)`),
              sql`,`,
            );
            const updated = await transaction.execute<{ id: string }>(sql`
              UPDATE article_sites AS s SET view_count = s.view_count + v.count, updated_at = now()
              FROM (VALUES ${values}) AS v(id, site_id, count)
              WHERE s.organization_id = ${organizationId}::uuid AND s.id = v.id AND s.site_id = v.site_id
              RETURNING s.id`);
            for (const row of updated) {
              const hit = pending.get(row.id);
              if (hit !== undefined) {
                pending.delete(row.id);
                appliedKeys.push(hit.key);
                applied += 1;
              }
            }
          }
          if (pending.size > 0) {
            const missing = await transaction.execute<{ id: string }>(sql`
              SELECT v.id FROM (VALUES ${sql.join(
                [...pending.values()].map(({ entry }) => sql`(${entry.articleSiteId}::uuid, ${entry.siteId}::uuid)`),
                sql`,`,
              )}) AS v(id, site_id)
              LEFT JOIN article_sites AS s
                ON s.organization_id = ${organizationId}::uuid AND s.id = v.id AND s.site_id = v.site_id
              WHERE s.id IS NULL`);
            for (const row of missing) {
              const hit = pending.get(row.id);
              if (hit !== undefined) {
                orphanKeys.push(hit.key);
                orphans += 1;
              }
            }
          }
        });
      } catch (error) {
        skipped += rows.length;
        auditFlushIssue(requestId, 'view-flush.org.skipped', { organizationId, rows: rows.length, error: error instanceof Error ? error.message : 'unknown' });
      }
    }
    for (let index = 0; index < appliedKeys.length; index += DEL_CHUNK_SIZE) {
      try {
        await redis.del(...appliedKeys.slice(index, index + DEL_CHUNK_SIZE));
      } catch {
        /* key yang gagal di-del akan ter-flush ganda kecil pada proses berikut; hitungan tetap konvergen */
      }
    }
    for (let index = 0; index < orphanKeys.length; index += DEL_CHUNK_SIZE) {
      try {
        await redis.del(...orphanKeys.slice(index, index + DEL_CHUNK_SIZE));
      } catch {
        /* yatim yang gagal di-del dibersihkan pada proses berikut */
      }
    }
    return NextResponse.json({ requestId, keys: deltas.size, applied, skipped, orphans }, { headers: noStore });
  }
}

export const GET = withApiAccess('GET /api/internal/maintenance/view-flush', handleGET);
