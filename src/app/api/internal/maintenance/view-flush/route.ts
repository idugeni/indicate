import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { logEvent } from '@/core/observability/logger';
import { recordOperation } from '@/core/observability/operation-metrics';
import { PAGEVIEW_KEY_TTL_SECONDS, parsePageviewKey } from '@/modules/site/pageview-contract';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { authorized } from '@/app/api/internal/auth';

function auditFlushIssue(requestId: string, event: string, fields: Readonly<Record<string, unknown>>): void {
  logEvent('warn', { event, requestId, context: fields });
}

/** Record one flush-phase sample; never throws. Counts only, no keys. */
function recordFlushPhase(
  operation: 'flush.scan' | 'flush.pop' | 'flush.commit' | 'flush.restore',
  provider: 'upstash-redis' | 'supabase-postgres',
  started: number,
  sample: { readonly commands?: number | undefined; readonly status?: number | undefined; readonly tenantId?: string | undefined },
): void {
  const durationMs = Date.now() - started;
  const isDb = provider === 'supabase-postgres';
  recordOperation({
    route: 'flush',
    operation,
    provider,
    ...(sample.tenantId === undefined ? {} : { tenantId: sample.tenantId }),
    durationMs,
    ...(isDb ? { dbQueries: sample.commands ?? 0, dbMs: durationMs } : { redisCommands: sample.commands ?? 0, redisMs: durationMs }),
    ...(sample.status === undefined ? {} : { status: sample.status }),
  });
}

interface FlushEntry {
  readonly organizationId: string;
  readonly siteId: string;
  readonly articleSiteId: string;
  readonly count: number;
}

type FlushDelta = Map<string, FlushEntry & { count: number }>;

/**
 * Keys pulled per flush iteration.
 *
 * @remarks One `SCAN` + one `GETDEL` eval per batch: a larger batch trades a
 * slightly bigger single response (key names only) for fewer REST round
 * trips, which is what the monthly Upstash command quota counts. Values
 * travel once via the pop eval regardless of batch size, so bandwidth is
 * unaffected.
 */
const SCAN_BATCH_SIZE = 1000;

/**
 * Batas halaman SCAN per eksekusi flush.
 *
 * @remarks Satu halaman = 1 SCAN + 1 EVAL, jadi batas ini memagari perintah
 * Redis per flush (500 halaman = maks ~1000 perintah + pipeline restore).
 * Kunci yang belum ter-pop mempertahankan EXPIRE 7-harinya dan ikut flush
 * 3-jam berikutnya — tidak ada pageview yang hilang diam-diam, hanya ditunda.
 */
export const VIEW_FLUSH_MAX_SCAN_PAGES = 500;

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
  logEvent('info', { event: 'view-flush.run.started', requestId });
  {
    const redis = new Redis({ url: context.config.redis.url, token: context.config.redis.token });
    const prefix = `pv:${context.bootstrap.environment}:`;
    const deltas: FlushDelta = new Map();
    let invalid = 0;
    let cursor = 0;
    let pages = 0;
    let evalPages = 0;
    let truncated = false;
    const scanStarted = Date.now();
    do {
      const [next, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: SCAN_BATCH_SIZE });
      cursor = Number(next);
      pages += 1;
      if (keys.length > 0) {
        const popped = (await redis.eval(POP_PAGE_SCRIPT, keys, [])) as string[];
        evalPages += 1;
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
      if (cursor !== 0 && pages >= VIEW_FLUSH_MAX_SCAN_PAGES) {
        truncated = true;
        auditFlushIssue(requestId, 'view-flush.scan.truncated', { pages, keys: deltas.size + invalid });
        break;
      }
    } while (cursor !== 0);
    recordFlushPhase('flush.scan', 'upstash-redis', scanStarted, { commands: pages + evalPages, status: 200 });
    recordFlushPhase('flush.pop', 'upstash-redis', scanStarted, { commands: evalPages, status: 200 });
    if (deltas.size === 0 && invalid === 0) {
      logEvent('info', { event: 'view-flush.run.completed', requestId, context: { keys: 0, applied: 0, skipped: 0, orphans: 0, invalid: 0, truncated, organizations: 0 } });
      return NextResponse.json({ requestId, keys: 0, applied: 0, skipped: 0, orphans: 0, invalid: 0, truncated }, { headers: noStore });
    }
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
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
      const commitStarted = Date.now();
      let commitQueries = 0;
      try {
        await runtime.db.transaction(async (transaction) => {
          await transaction.execute(sql`RESET app.organization_id`);
          await transaction.execute(sql`RESET app.region_id`);
          await transaction.execute(sql`RESET app.actor_id`);
          await transaction.execute(sql`RESET app.request_id`);
          await transaction.execute(sql`SELECT indicate_private.set_tenant_context(${organizationId}::uuid, ${'system:view-flush'}, ${requestId})`);
          await transaction.execute(sql`SELECT indicate_private.set_region_context(NULL::uuid)`);
          commitQueries += 6;
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
            commitQueries += 1;
            const appliedIds = new Set(updated.map((row) => row.id));
            const appliedEntries = chunk.filter(({ entry }) => appliedIds.has(entry.articleSiteId));
            if (appliedEntries.length > 0) {
              const dayValues = sql.join(
                appliedEntries.map(({ entry }) => sql`(${organizationId}::uuid, ${entry.articleSiteId}::uuid, ${entry.siteId}::uuid, CURRENT_DATE, ${entry.count}::int)`),
                sql`,`,
              );
              await transaction.execute(sql`
                INSERT INTO public.article_site_view_days AS d (organization_id, article_site_id, site_id, day, views)
                VALUES ${dayValues}
                ON CONFLICT (organization_id, article_site_id, day)
                DO UPDATE SET views = d.views + EXCLUDED.views`);
              commitQueries += 1;
            }
            for (const row of updated) {
              const hit = pending.get(row.id);
              if (hit !== undefined) {
                pending.delete(row.id);
                appliedKeys.push(hit.key);
                applied += 1;
              }
            }
            const bridgeChunk = chunk.filter(({ entry }) => pending.has(entry.articleSiteId));
            if (bridgeChunk.length > 0) {
              const bridgeValues = sql.join(
                bridgeChunk.map(({ entry }) => sql`(${entry.articleSiteId}::uuid, ${entry.siteId}::uuid, ${entry.count}::int)`),
                sql`,`,
              );
              const bridgeUpdated = await transaction.execute<{ id: string }>(sql`
              UPDATE portal_assignments AS p SET view_count = p.view_count + v.count, updated_at = now()
              FROM (VALUES ${bridgeValues}) AS v(id, site_id, count)
              WHERE p.organization_id = ${organizationId}::uuid AND p.id = v.id AND p.site_id = v.site_id
              RETURNING p.id`);
              commitQueries += 1;
              for (const row of bridgeUpdated) {
                const hit = pending.get(row.id);
                if (hit !== undefined) {
                  pending.delete(row.id);
                  appliedKeys.push(hit.key);
                  applied += 1;
                }
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
              LEFT JOIN portal_assignments AS p
                ON p.organization_id = ${organizationId}::uuid AND p.id = v.id AND p.site_id = v.site_id
              WHERE s.id IS NULL AND p.id IS NULL`);
            commitQueries += 1;
            for (const row of missing) {
              const hit = pending.get(row.id);
              if (hit !== undefined) {
                orphanKeys.push(hit.key);
                orphans += 1;
              }
            }
          }
        });
        recordFlushPhase('flush.commit', 'supabase-postgres', commitStarted, { commands: commitQueries, status: 200, tenantId: organizationId });
      } catch (error) {
        recordFlushPhase('flush.commit', 'supabase-postgres', commitStarted, { commands: commitQueries, status: 500, tenantId: organizationId });
        skipped += rows.length;
        const restoreStarted = Date.now();
        try {
          const pipeline = redis.pipeline();
          for (const { key, entry } of rows) {
            pipeline.incrby(key, entry.count);
            pipeline.expire(key, PAGEVIEW_KEY_TTL_SECONDS);
          }
          await pipeline.exec();
          recordFlushPhase('flush.restore', 'upstash-redis', restoreStarted, { commands: rows.length * 2, status: 200, tenantId: organizationId });
        } catch {
          recordFlushPhase('flush.restore', 'upstash-redis', restoreStarted, { commands: rows.length * 2, status: 500, tenantId: organizationId });
          auditFlushIssue(requestId, 'view-flush.org.restore-failed', { organizationId, rows: rows.length });
        }
        auditFlushIssue(requestId, 'view-flush.org.skipped', { organizationId, rows: rows.length, error: error instanceof Error ? error.message : 'unknown' });
      }
    }
    logEvent('info', { event: 'view-flush.run.completed', requestId, context: { keys: deltas.size + invalid, applied, skipped, orphans, invalid, truncated, organizations: byOrg.size } });
    return NextResponse.json({ requestId, keys: deltas.size + invalid, applied, skipped, orphans, invalid, truncated }, { headers: noStore });
  }
}

/**
 * Flush buffered pageview counts into article view totals plus daily buckets.
 *
 * @remarks Pooled sessions carry the previous request's tenant/region GUCs: set_tenant_context rejects a different org (conflict) and a stale region filters rows out, both silently dropping the flush. RESET first per org inside one transaction (one pinned connection), then enforce a clean flush context. Each chunk writes lifetime view_count to `article_sites` (plus today's `article_site_view_days` upsert for RETURNING rows) and falls through to `portal_assignments` for bridge beacons; orphans missing from both skip the daily bucket. INCRBY restore is safe from partial duplication because the per-org transaction is atomic: a throw anywhere rolls back that org's whole chunk so the refund equals exactly what was popped; the restore key gets a 7-day EXPIRE.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/view-flush', handleGET);

export const maxDuration = 300;
