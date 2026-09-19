import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly articleId?: unknown;
  } | null;
  if (body === null || typeof body.articleId !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const listed = await gate.value.composition.sharedFactory.create().articles.listEditorial(gate.value.context.actor);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  const article = listed.value.articles.find(({ id }) => id === body.articleId);
  if (article === undefined) {
    return NextResponse.json({ error: { code: 'RESOURCE_UNAVAILABLE', message: 'The requested resource is unavailable.' } }, { status: 404 });
  }
  return NextResponse.json(
    {
      article: {
        id: article.id,
        regionId: article.regionId,
        title: article.title,
        body: article.body,
        source: article.source,
        slug: article.slug,
        status: article.status,
        version: article.version,
      },
      regions: listed.value.regions.map(({ id, name, status }) => ({ id, name, status })),
      sites: listed.value.sites.map(({ id, normalizedHostname, regionId, status }) => ({ id, normalizedHostname, regionId, status })),
      assignments: listed.value.articleSites.filter(({ articleId }) => articleId === article.id).map(({ siteId, state, publishedUrl }) => ({ siteId, state, publishedUrl })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/article', handlePOST);
