import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

interface ArticleInput {
  readonly id?: unknown;
  readonly regionId?: unknown;
  readonly title?: unknown;
  readonly body?: unknown;
  readonly source?: unknown;
  readonly slug?: unknown;
}

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly article?: ArticleInput | null;
  } | null;
  if (body === null || typeof body.article !== 'object' || body.article === null) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const { actor } = gate.value.context;
  const articles = gate.value.composition.sharedFactory.create().articles;
  if (typeof body.article.id === 'string' && body.article.id !== '') {
    const listed = await articles.listEditorial(actor);
    if (!listed.ok) return miniAppErrorResponse(listed.error);
    const current = listed.value.articles.find(({ id }) => id === body.article?.id);
    if (current === undefined) {
      return NextResponse.json({ error: { code: 'RESOURCE_UNAVAILABLE', message: 'The requested resource is unavailable.' } }, { status: 404 });
    }
    const updated = await articles.updateArticle(actor, {
      id: current.id,
      expectedVersion: current.version,
      regionId: typeof body.article.regionId === 'string' ? body.article.regionId : current.regionId,
      publisherId: current.publisherId,
      categoryId: current.categoryId,
      authorId: current.authorId,
      slug: typeof body.article.slug === 'string' ? body.article.slug : current.slug,
      title: typeof body.article.title === 'string' ? body.article.title : current.title,
      body: typeof body.article.body === 'string' ? body.article.body : current.body,
      source: typeof body.article.source === 'string' ? body.article.source : current.source,
      tags: [...current.tags],
      status: current.status,
    });
    if (!updated.ok) return miniAppErrorResponse(updated.error);
    return NextResponse.json({ article: { id: updated.value.id } }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const created = await articles.createArticle(actor, {
    regionId: body.article.regionId,
    title: body.article.title,
    body: body.article.body,
    source: body.article.source,
    slug: body.article.slug,
    publisherId: null,
    categoryId: null,
    authorId: null,
    status: 'draft',
  });
  if (!created.ok) return miniAppErrorResponse(created.error);
  return NextResponse.json({ article: { id: created.value.id } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const POST = withApiAccess('POST /api/tg/app/article-save', handlePOST);
