import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly jobId?: unknown;
    readonly action?: unknown;
  } | null;
  if (body === null || typeof body.jobId !== 'string') {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  }
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const { actor } = gate.value.context;
  const publication = gate.value.composition.sharedFactory.create().publication;
  if (body.action === 'retry' || body.action === 'unpublish') {
    const acted = body.action === 'retry' ? await publication.retry(actor, { jobId: body.jobId }) : await publication.unpublish(actor, { jobId: body.jobId });
    if (!acted.ok) return miniAppErrorResponse(acted.error);
    return NextResponse.json({ job: { id: acted.value.job.id, state: acted.value.job.state } }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const status = await publication.status(actor, { jobId: body.jobId });
  if (!status.ok) return miniAppErrorResponse(status.error);
  return NextResponse.json(
    {
      job: { id: status.value.job.id, state: status.value.job.state, createdAt: status.value.job.createdAt },
      targets: status.value.targets.map((target) => ({ siteId: target.siteId, state: target.state })),
      urls: status.value.result?.urls ?? [],
      successfulCount: status.value.result?.successfulCount ?? null,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/job', handlePOST);
