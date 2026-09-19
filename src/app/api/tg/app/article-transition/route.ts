import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly articleId?: unknown;
    readonly action?: unknown;
  } | null;
  if (body === null || typeof body.articleId !== 'string' || (body.action !== 'archive' && body.action !== 'restore')) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const { actor } = gate.value.context;
  const articles = gate.value.composition.sharedFactory.create().articles;
  const listed = await articles.listEditorial(actor);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  const current = listed.value.articles.find(({ id }) => id === body.articleId);
  if (current === undefined) {
    return NextResponse.json({ error: { code: 'RESOURCE_UNAVAILABLE', message: 'The requested resource is unavailable.' } }, { status: 404 });
  }
  const transitioned =
    body.action === 'archive'
      ? await articles.archiveArticle(actor, { id: current.id, expectedVersion: current.version })
      : await articles.restoreArticle(actor, { id: current.id, expectedVersion: current.version });
  if (!transitioned.ok) return miniAppErrorResponse(transitioned.error);
  return NextResponse.json({ article: { id: transitioned.value.id, status: transitioned.value.status } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const POST = withApiAccess('POST /api/tg/app/article-transition', handlePOST);
