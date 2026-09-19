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
      regions: listed.value.regions.map(({ id, name, status }) => ({ id, name, status })),
      sites: listed.value.sites.map(({ id, normalizedHostname, regionId, status }) => ({ id, normalizedHostname, regionId, status })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/sites', handlePOST);
