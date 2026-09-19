import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { parsePageviewKey } from '@/modules/site/pageview-contract';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';

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

type FlushDelta = Map<string, FlushEntry & { count: number }>;

const POP_PAGE_SCRIPT = `
local out = {}
for _, key in ipairs(KEYS) do
  local val = redis.call('GETDEL', key)
  if val then
    out[#out + 1] = key
    out[#out + 1] = val
  end
end
return out
`;

const UPDATE_CHUNK_SIZE = 500;

export function collectPoppedDeltas(pairs: readonly string[]): {
  readonly deltas: FlushDelta;
  readonly invalidKeys: readonly string[];
} {
  const deltas: FlushDelta = new Map();
  const invalidKeys: string[] = [];
  for (let index = 0; index + 1 < pairs.length; index += 2) {
    const key = pairs[index]!;
    const count = Number(pairs[index + 1]);
    const identity = parsePageviewKey(key);
    if (identity === null || !Number.isFinite(count) || count <= 0) {
      invalidKeys.push(key);
      continue;
    }
    const { organizationId, siteId, articleSiteId } = identity;
    const existing = deltas.get(key);
    deltas.set(key, {
      organizationId: existing?.organizationId ?? organizationId,
      siteId: existing?.siteId ?? siteId,
      articleSiteId: existing?.articleSiteId ?? articleSiteId,
      count: (existing?.count ?? 0) + count,
    });
  }
  return { deltas, invalidKeys };
}

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
    const deltas: FlushDelta = new Map();
    let invalid = 0;
    let cursor = 0;
    do {
      const [next, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 200 });
      cursor = Number(next);
      if (keys.length > 0) {
        const popped = (await redis.eval(POP_PAGE_SCRIPT, keys, [])) as string[];
        const outcome = collectPoppedDeltas(popped);
        for (const [key, entry] of outcome.deltas) {
          const existing = deltas.get(key);
          deltas.set(key, {
            organizationId: existing?.organizationId ?? entry.organizationId,
            siteId: existing?.siteId ?? entry.siteId,
            articleSiteId: existing?.articleSiteId ?? entry.articleSiteId,
            count: (existing?.count ?? 0) + entry.count,
          });
        }
        invalid += outcome.invalidKeys.length;
      }
    } while (cursor !== 0);
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
        try {
          const pipeline = redis.pipeline();
          for (const { key, entry } of rows) pipeline.incrby(key, entry.count);
          await pipeline.exec();
        } catch {
          auditFlushIssue(requestId, 'view-flush.org.restore-failed', { organizationId, rows: rows.length });
        }
        auditFlushIssue(requestId, 'view-flush.org.skipped', { organizationId, rows: rows.length, error: error instanceof Error ? error.message : 'unknown' });
      }
    }
    return NextResponse.json({ requestId, keys: deltas.size + invalid, applied, skipped, orphans, invalid }, { headers: noStore });
  }
}

/**
 * Flush buffered pageview counts into article view totals.
 *
 * @remarks Sesi pooled membawa GUC tenant/region request sebelumnya: set_tenant_context menolak org berbeda (conflict) dan region basi menyaring baris keluar, keduanya diam-diam menggugurkan flush. RESET dulu per org di dalam satu transaksi (satu koneksi terjepit), lalu tegakkan konteks flush yang bersih.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/view-flush', handleGET);
