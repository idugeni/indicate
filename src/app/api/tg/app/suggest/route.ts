import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly articleId?: unknown;
    readonly siteIds?: unknown;
  } | null;
  if (body === null || typeof body.articleId !== 'string' || !Array.isArray(body.siteIds) || body.siteIds.length === 0 || body.siteIds.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const suggested = await gate.value.composition.sharedFactory.create().publication.suggest(gate.value.context.actor, {
    articleId: body.articleId,
    siteIds: body.siteIds as string[],
  });
  if (!suggested.ok) return miniAppErrorResponse(suggested.error);
  return NextResponse.json({ articleId: suggested.value.articleId, overrides: suggested.value.overrides }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const POST = withApiAccess('POST /api/tg/app/suggest', handlePOST);
