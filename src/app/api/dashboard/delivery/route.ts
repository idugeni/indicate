import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { DeliveryOperationPendingError } from '@/modules/delivery/domain-provisioning-service';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { DeliveryConflictError, DeliveryResourceUnavailableError } from '@/modules/delivery/ports';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { getPublicConfig } from '@/core/config/public-config';
import { deliveryOperationsComposition } from '@/modules/delivery';

const commandSchema = z.object({ organizationId: z.uuid(), siteId: z.uuid(), action: z.enum(['activate', 'deactivate']), hostname: z.string().min(1).max(253), previousHostname: z.string().min(1).max(253).nullable().optional() });

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid Delivery command.', requestId), { status: 400 });
  const composition = await deliveryOperationsComposition();
  try {
    const cookieStore = await cookies();
    const publicConfig = getPublicConfig(process.env);
    const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey, cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }) });
    const identity = await auth.verifyCookieSession(); if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const authorization = new DrizzleAuthorizationRepository(composition.runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator()); if (!local.ok) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const membership = await authorization.findActiveMembership(parsed.data.organizationId, local.value.id);
    if (membership === null || !membership.roleActive || !membership.orgPermissions.has('sites.manage')) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const actor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId: parsed.data.organizationId, permissionSet: new Set(membership.orgPermissions), platformPermissionSet: new Set(membership.platformPermissions), regionScopeId: membership.regionId ?? null, entryPoint: 'dashboard', requestId };
    if (parsed.data.action === 'activate') {
      const context = await composition.provisioning.activate(actor, parsed.data.siteId, parsed.data.hostname, new Date(), parsed.data.previousHostname ?? null);
      return NextResponse.json(context);
    }
    await composition.provisioning.deactivate(actor, parsed.data.siteId, parsed.data.hostname);
    return NextResponse.json({ accepted: true });
  } catch (error) {
    if (error instanceof DeliveryOperationPendingError) return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The domain operation is durably pending and will be retried.', requestId), { status: 503 });
    if (error instanceof DeliveryConflictError) return NextResponse.json(createPublicError('CONFLICT', 'The domain operation conflicts with current state.', requestId), { status: 409 });
    if (error instanceof DeliveryResourceUnavailableError) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (error instanceof Error && error.message === 'CONFIGURATION_INVALID') return NextResponse.json(createPublicError('CONFIGURATION_INVALID', 'The domain configuration is invalid.', requestId), { status: 400 });
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The domain operation is currently unavailable.', requestId), { status: 503 });
  }
}

export const POST = withApiAccess('POST /api/dashboard/delivery', handlePOST);
