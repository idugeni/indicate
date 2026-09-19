import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly articleId?: unknown;
  } | null;
  if (body === null) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const listed = await gate.value.composition.sharedFactory.create().media.list(gate.value.context.actor);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  const assets = listed.value.filter(
    (asset) => asset.state === 'active' && asset.owner.kind === 'article' && (typeof body.articleId !== 'string' || asset.owner.articleId === body.articleId),
  );
  return NextResponse.json(
    { assets: assets.map(({ id, state, createdAt }) => ({ id, state, createdAt })) },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/media-list', handlePOST);
