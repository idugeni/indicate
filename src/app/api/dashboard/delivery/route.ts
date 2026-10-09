import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { DeliveryOperationPendingError } from '@/modules/delivery/domain-provisioning-service';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { DeliveryConflictError, DeliveryResourceUnavailableError } from '@/modules/delivery/ports';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { deliveryOperationsComposition } from '@/modules/delivery';

const commandSchema = z.object({ organizationId: z.uuid(), siteId: z.uuid(), action: z.enum(['activate', 'deactivate']), hostname: z.string().min(1).max(253), previousHostname: z.string().min(1).max(253).nullable().optional() });

/**
 * Map a delivery failure to its HTTP status.
 *
 * @param error - Error thrown by the provisioning composition.
 * @returns Status honoring pending (503), conflict (409), unavailable (404), and invalid config (400).
 */
function deliveryErrorStatus(error: unknown): number {
  if (error instanceof DeliveryOperationPendingError) return 503;
  if (error instanceof DeliveryConflictError) return 409;
  if (error instanceof DeliveryResourceUnavailableError) return 404;
  if (error instanceof Error && error.message === 'CONFIGURATION_INVALID') return 400;
  return 503;
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid Delivery command.', requestId), { status: 400 });
  const composition = await deliveryOperationsComposition();
  try {
    const cookieStore = await cookies();
    const user = await authenticateDashboardUser(composition.runtime.db, cookieStore, requestId);
    if (user === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const actor = await authorizeDashboardOrganization(composition.runtime.db, user, parsed.data.organizationId, requestId);
    if (actor === null || !actor.permissionSet.has('sites.manage')) {
      return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    }
    if (parsed.data.action === 'activate') {
      const context = await composition.provisioning.activate(actor, parsed.data.siteId, parsed.data.hostname, new Date(), parsed.data.previousHostname ?? null);
      return NextResponse.json(context);
    }
    await composition.provisioning.deactivate(actor, parsed.data.siteId, parsed.data.hostname);
    return NextResponse.json({ accepted: true });
  } catch (error) {
    const status = deliveryErrorStatus(error);
    if (error instanceof DeliveryOperationPendingError) return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The domain operation is durably pending and will be retried.', requestId), { status });
    if (error instanceof DeliveryConflictError) return NextResponse.json(createPublicError('CONFLICT', 'The domain operation conflicts with current state.', requestId), { status });
    if (error instanceof DeliveryResourceUnavailableError) return NextResponse.json(createNonDisclosingDenial(requestId), { status });
    if (error instanceof Error && error.message === 'CONFIGURATION_INVALID') return NextResponse.json(createPublicError('CONFIGURATION_INVALID', 'The domain configuration is invalid.', requestId), { status });
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The domain operation is currently unavailable.', requestId), { status });
  }
}

const POST = withApiAccess('POST /api/dashboard/delivery', handlePOST);
