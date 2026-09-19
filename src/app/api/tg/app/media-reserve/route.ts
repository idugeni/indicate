import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly filename?: unknown;
    readonly mediaType?: unknown;
    readonly sizeBytes?: unknown;
    readonly checksum?: unknown;
    readonly articleId?: unknown;
  } | null;
  if (body === null || typeof body.filename !== 'string' || typeof body.mediaType !== 'string' || typeof body.sizeBytes !== 'number' || typeof body.checksum !== 'string' || typeof body.articleId !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const reserved = await gate.value.composition.sharedFactory.create().media.reserveUpload(gate.value.context.actor, {
    filename: body.filename,
    mediaType: body.mediaType,
    sizeBytes: body.sizeBytes,
    checksum: body.checksum,
    purpose: 'article-image',
    owner: { kind: 'article', articleId: body.articleId },
  });
  if (!reserved.ok) return miniAppErrorResponse(reserved.error);
  return NextResponse.json(
    {
      reservation: {
        reservationId: reserved.value.reservationId,
        url: reserved.value.authorization.url,
        requiredHeaders: reserved.value.authorization.requiredHeaders,
        mediaType: body.mediaType,
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/media-reserve', handlePOST);
