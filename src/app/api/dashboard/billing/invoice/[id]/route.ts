import { cookies } from 'next/headers';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardPlatform } from '@/modules/auth/authenticate-dashboard';
import { BillingService } from '@/modules/billing/billing-service';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { invoiceDocument, type InvoiceSeals } from './route-helpers';

const paramsSchema = z.object({ organizationId: z.uuid().optional() });


async function handleGET(request: Request, context: { readonly params: Promise<{ readonly id: string }> }) {
  const requestId = resolveRequestId(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  const parsed = paramsSchema.safeParse({ organizationId: url.searchParams.get('organizationId') ?? undefined });
  if (!parsed.success || parsed.data.organizationId === undefined) {
    return new Response('Not Found', { status: 404 });
  }
  const cookieStore = await cookies();
  const serverContext = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(serverContext.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return new Response('Not Found', { status: 404 });
  const actor = await authorizeDashboardPlatform(runtime.db, user, requestId, parsed.data.organizationId);
  if (actor === null) return new Response('Not Found', { status: 404 });
  {
    const service = new BillingService(new DrizzleBillingRepository(runtime.db));
    const result = await service.invoiceDetail(actor, parsed.data.organizationId, id);
    if (!result.ok) return new Response('Not Found', { status: 404 });
    const seals: InvoiceSeals = {
      signUrl: `/api/dashboard/billing/invoice/${encodeURIComponent(id)}/seal?type=sign&organizationId=${encodeURIComponent(parsed.data.organizationId)}`,
      stampUrl: `/api/dashboard/billing/invoice/${encodeURIComponent(id)}/seal?type=stamp&organizationId=${encodeURIComponent(parsed.data.organizationId)}`,
    };
    return new Response(invoiceDocument(result.value, seals), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}

export const GET = withApiAccess('GET /api/dashboard/billing/invoice/[id]', handleGET);
