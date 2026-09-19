import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { miniAppErrorResponse, requireMiniAppOwner } from '@/app/api/tg/app/_auth';
import { ownerAdminActor, resolveSolePlatformAdmin } from '@/app/api/tg/app/_owner-admin';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const STATUSES = ['active', 'suspended', 'cancelled'] as const;

function invalid(): NextResponse {
  return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.' } }, { status: 400 });
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  const body = (await request.json().catch(() => null)) as {
    readonly initData?: unknown;
    readonly organizationId?: unknown;
    readonly targetOrganizationId?: unknown;
    readonly action?: unknown;
    readonly status?: unknown;
    readonly expectedVersion?: unknown;
  } | null;
  if (body === null || (body.action !== 'state' && body.action !== 'update')) return invalid();
  const gate = await requireMiniAppOwner(request, body);
  if (!gate.ok) return gate.error;
  const target = typeof body.targetOrganizationId === 'string' && body.targetOrganizationId !== ''
    ? body.targetOrganizationId
    : gate.value.context.actor.organizationId;
  if (!UUID_PATTERN.test(target)) return invalid();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const admin = await resolveSolePlatformAdmin(runtime.db);
  if (admin === null) {
    return NextResponse.json({ error: { code: 'INVALID_INPUT', message: 'Invalid Mini App request.', requestId } }, { status: 400 });
  }
  const actor = ownerAdminActor(admin, target, requestId);
  const customer = gate.value.composition.customer;
  if (body.action === 'state') {
    const read = await customer.read(actor as never, target);
    if (!read.ok) return miniAppErrorResponse(read.error);
    const subscription = read.value.subscription;
    return NextResponse.json(
      { state: subscription?.status ?? 'none', version: subscription?.version ?? null },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }
  if (typeof body.status !== 'string' || !(STATUSES as readonly string[]).includes(body.status)) return invalid();
  if (
    body.expectedVersion !== undefined
    && (typeof body.expectedVersion !== 'number' || !Number.isInteger(body.expectedVersion) || body.expectedVersion <= 0)
  ) {
    return invalid();
  }
  const updated = await customer.updateSubscription(actor as never, {
    organizationId: target,
    status: body.status,
    ...(body.expectedVersion === undefined ? {} : { expectedVersion: body.expectedVersion }),
  });
  if (!updated.ok) return miniAppErrorResponse(updated.error);
  return NextResponse.json(
    { state: updated.value.status, version: updated.value.version },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export const POST = withApiAccess('POST /api/tg/app/subscription', handlePOST);
