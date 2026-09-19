import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';
import { ownerAdminActor, resolveSolePlatformAdmin } from '@/app/api/tg/app/_owner-admin';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';

export interface DigestEntry {
  readonly organizationId: string;
  readonly name: string;
  readonly status: string;
  readonly articles: number;
  readonly published: number;
  readonly failed: number;
}

function startOfTodayIso(now: Date): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return day.toISOString();
}

/**
 * Cross-organization daily publishing digest for the owner Mini App.
 *
 * @param request - POST carrying Mini App init data; no target org needed.
 * @returns Per-organization today counts (articles, published outcomes,
 * failed jobs) plus totals; failing orgs are skipped with partial set.
 */
async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  const body = (await request.json().catch(() => null)) as { readonly initData?: unknown } | null;
  if (body === null) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  const gate = await requireMiniAppOwner(request, { initData: body.initData, organizationId: '00000000-0000-0000-0000-000000000000' });
  if (!gate.ok) return gate.error;
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const admin = await resolveSolePlatformAdmin(runtime.db);
  if (admin === null) return miniAppErrorResponse({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' }, requestId });
  const sessionActor = ownerAdminActor(admin, '00000000-0000-0000-0000-000000000000', requestId);
  const listed = await gate.value.composition.customer.list(sessionActor as never);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  const from = startOfTodayIso(new Date());
  const entries: DigestEntry[] = [];
  let partial = false;
  const service = gate.value.composition.sharedFactory.create();
  for (const { customer } of listed.value) {
    if (customer.status !== 'active') continue;
    try {
      const actor = { ...gate.value.context.actor, organizationId: customer.id };
      const analytics = await service.articles.analytics(actor, { from });
      if (!analytics.ok) {
        partial = true;
        continue;
      }
      const points = analytics.value;
      const articles = points.articlesBySite.reduce((sum, point) => sum + point.count, 0);
      const published = points.outcomesBySiteRegionAndState
        .filter((point) => point.key.endsWith(':published'))
        .reduce((sum, point) => sum + point.count, 0);
      const failed = points.jobsByState
        .filter((point) => point.key === 'failed')
        .reduce((sum, point) => sum + point.count, 0);
      entries.push({ organizationId: customer.id, name: customer.name, status: customer.status, articles, published, failed });
    } catch {
      partial = true;
    }
  }
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const totals = entries.reduce(
    (sum, entry) => ({ articles: sum.articles + entry.articles, published: sum.published + entry.published, failed: sum.failed + entry.failed }),
    { articles: 0, published: 0, failed: 0 },
  );
  return NextResponse.json(
    { date: from.slice(0, 10), organizations: entries, totals, partial },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/digest', handlePOST);
