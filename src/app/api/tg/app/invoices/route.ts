import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';
import { ownerAdminActor, resolveSolePlatformAdmin } from '@/app/api/tg/app/_owner-admin';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { BillingService } from '@/modules/billing/billing-service';
import { SINGLE_INVOICE_AMOUNT_IDR } from '@/modules/billing/schemas';

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
    readonly action?: unknown;
    readonly dueAt?: unknown;
    readonly billingNote?: unknown;
    readonly expectedVersion?: unknown;
    readonly paidAt?: unknown;
    readonly paymentMethod?: unknown;
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
  if (body.action === 'issue') {
    if (typeof body.dueAt !== 'string' || (typeof body.billingNote !== 'string' && body.billingNote !== undefined)) return invalid(requestId);
    const issued = await billing.issueInvoice(actor, {
      organizationId: target,
      amountIdr: SINGLE_INVOICE_AMOUNT_IDR,
      dueAt: body.dueAt,
      billingNote: typeof body.billingNote === 'string' ? body.billingNote : null,
    });
    if (!issued.ok) return miniAppErrorResponse(issued.error);
    return NextResponse.json({ invoice: issued.value }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (body.action === 'pay') {
    if (typeof body.invoiceId !== 'string' || typeof body.expectedVersion !== 'number' || typeof body.paidAt !== 'string'
      || (typeof body.paymentMethod !== 'string' && body.paymentMethod !== undefined)) return invalid(requestId);
    const paid = await billing.payInvoice(actor, {
      invoiceId: body.invoiceId,
      expectedVersion: body.expectedVersion,
      paidAt: body.paidAt,
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : null,
    });
    if (!paid.ok) return miniAppErrorResponse(paid.error);
    return NextResponse.json({ invoice: paid.value }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
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
        dueAt: invoice.dueAt,
        version: invoice.version,
        createdAt: invoice.createdAt,
        paymentMethod: invoice.paymentMethod,
      })),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/invoices', handlePOST);
