import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly reservationId?: unknown;
  } | null;
  if (body === null || typeof body.reservationId !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const completed = await gate.value.composition.sharedFactory.create().media.completeUpload(gate.value.context.actor, { reservationId: body.reservationId });
  if (!completed.ok) return miniAppErrorResponse(completed.error);
  return NextResponse.json({ asset: { id: completed.value.id, state: completed.value.state } }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export const POST = withApiAccess('POST /api/tg/app/media-complete', handlePOST);
