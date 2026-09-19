import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as { readonly initData?: unknown; readonly organizationId?: unknown } | null;
  if (body === null) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const listed = await gate.value.composition.sharedFactory.create().articles.listEditorial(gate.value.context.actor);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  return NextResponse.json(
    {
      articles: listed.value.articles.map((article) => ({
        id: article.id,
        title: article.title,
        status: article.status,
        regionId: article.regionId,
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/articles', handlePOST);
