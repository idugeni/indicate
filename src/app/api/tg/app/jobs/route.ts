import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';

async function handlePOST(request: Request) {
  const body = (await request.json().catch(() => null)) as { readonly initData?: unknown; readonly organizationId?: unknown } | null;
  if (body === null) return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const jobs = await gate.value.composition.sharedFactory.create().publication.listJobs(gate.value.context.actor);
  if (!jobs.ok) return miniAppErrorResponse(jobs.error);
  return NextResponse.json(
    {
      jobs: jobs.value.map(({ job, articleTitle }) => ({
        id: job.id,
        articleTitle,
        state: job.state,
        createdAt: job.createdAt,
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/jobs', handlePOST);
