import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';
import { ownerAdminActor, resolveSolePlatformAdmin } from '@/app/api/tg/app/_owner-admin';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { BillingService } from '@/modules/billing/billing-service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function invalid(requestId: string): NextResponse {
  return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.', requestId } }, { status: 400 });
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly targetOrganizationId?: unknown;
    readonly invoiceId?: unknown;
  } | null;
  if (body === null) return invalid(requestId);
  if (body.invoiceId !== undefined && (typeof body.invoiceId !== 'string' || body.invoiceId === '')) return invalid(requestId);
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const target = typeof body.targetOrganizationId === 'string' && body.targetOrganizationId !== ''
    ? body.targetOrganizationId
    : gate.value.context.actor.organizationId;
  if (!UUID_PATTERN.test(target)) return invalid(requestId);
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const admin = await resolveSolePlatformAdmin(runtime.db);
  if (admin === null) return invalid(requestId);
  const actor = ownerAdminActor(admin, target, requestId);
  const billing = new BillingService(new DrizzleBillingRepository(runtime.db));
  if (typeof body.invoiceId === 'string') {
    const detail = await billing.invoiceDetail(actor, target, body.invoiceId);
    if (!detail.ok) return miniAppErrorResponse(detail.error);
    return NextResponse.json({ invoice: detail.value }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  const state = await billing.subscriptionState(actor, target);
  if (!state.ok) return miniAppErrorResponse(state.error);
  const listed = await billing.listInvoices(actor, target);
  if (!listed.ok) return miniAppErrorResponse(listed.error);
  return NextResponse.json(
    {
      state: state.value.state,
      invoices: listed.value.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amountIdr: invoice.amountIdr,
        status: invoice.status,
        paidAt: invoice.paidAt,
        createdAt: invoice.createdAt,
        paymentMethod: invoice.paymentMethod,
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/invoices', handlePOST);
