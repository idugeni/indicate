import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { sql } from 'drizzle-orm';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { sweepFacebookMetadata } from '@/modules/delivery/social-sweep';
import type { SocialSweepHost } from '@/modules/delivery/social-sweep';
import { authorized } from '@/app/api/internal/maintenance/view-flush/route';

/**
 * Calls per run. Meta spends several units of an app-wide quota per scrape, so
 * the batch is deliberately small: the fleet is swept by repetition, not by
 * finishing inside one window.
 */
const DEFAULT_BATCH_LIMIT = 20;
const CURSOR_KEY = 'ops:facebook-prewarm:offset';
const CURSOR_TTL_SECONDS = 60 * 60 * 24 * 30;

function logSweepIssue(requestId: string, event: string, fields: Readonly<Record<string, unknown>>): void {
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    service: 'indicate-web',
    event,
    requestId,
    ...fields,
  }));
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const noStore = { 'Cache-Control': 'private, no-store' };
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { ...noStore, 'X-Robots-Tag': 'noindex, nofollow' } });
  }

  const appToken = context.config.social?.facebookAppToken ?? null;
  if (appToken === null || appToken.length === 0) {
    return NextResponse.json({ requestId, skipped: 'facebook_app_token_unconfigured' }, { headers: noStore });
  }

  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const rows = await runtime.db.execute<{ normalized_hostname: string; region_id: string | null }>(sql`
    SELECT normalized_hostname, region_id FROM indicate_private.read_runtime_config_active_sites()`);
  const hosts: readonly SocialSweepHost[] = rows
    .filter((row) => typeof row.normalized_hostname === 'string' && row.normalized_hostname.length > 0)
    .map((row) => ({ hostname: row.normalized_hostname, apex: row.region_id === null }));
  if (hosts.length === 0) {
    return NextResponse.json({ requestId, skipped: 'no_active_sites' }, { headers: noStore });
  }

  const redis = new Redis({ url: context.config.redis.url, token: context.config.redis.token });
  const namespace = `${context.bootstrap.environment}:`;
  const offset = Number((await redis.get(`${namespace}${CURSOR_KEY}`)) ?? 0) || 0;
  const report = await sweepFacebookMetadata({ hosts, offset, limit: DEFAULT_BATCH_LIMIT, appToken });

  await redis.set(`${namespace}${CURSOR_KEY}`, report.nextOffset, { ex: CURSOR_TTL_SECONDS });

  for (const result of report.results) {
    if (result.outcome === 'verified' && !result.incomplete) continue;
    logSweepIssue(requestId, 'facebook-prewarm.host', { hostname: result.hostname, outcome: result.outcome, detail: result.detail });
  }
  if (report.halted) {
    logSweepIssue(requestId, 'facebook-prewarm.halted', { attempted: report.attempted, nextOffset: report.nextOffset, detail: report.results.at(-1)?.detail ?? null });
  }

  return NextResponse.json(
    {
      requestId,
      hosts: hosts.length,
      offset,
      attempted: report.attempted,
      verified: report.verified,
      incomplete: report.incomplete,
      unreachable: report.unreachable,
      rejected: report.rejected,
      failed: report.failed,
      halted: report.halted,
      nextOffset: report.nextOffset,
    },
    { headers: noStore },
  );
}

/**
 * Sweep one bounded batch of tenant homepages through Meta's scrape endpoint.
 *
 * @remarks Progress lives in a Redis cursor rather than request state, so each
 * cron tick continues where the last one stopped and the fleet is covered by
 * repetition. A rate-limit rejection halts the batch and leaves the cursor on
 * the unattempted host, because retrying inside the same window only spends
 * budget that the next window needs.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/facebook-prewarm', handleGET);

export const maxDuration = 300;
