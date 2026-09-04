import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

const commandSchema = z.object({ organizationId: z.uuid() });

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const cookieStore = await cookies();

  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      set: (name, value, options) => {
        cookieStore.set(name, value, options);
      },
    }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await getServerRuntimeContext();
  const runtime = createRuntimeDatabase(context.legacy);
  try {
    const repository = new DrizzleAuthorizationRepository(runtime.db);
    const localUserResult = await resolveVerifiedLocalUser(identity, repository, new UuidGenerator());
    if (!localUserResult.ok) {
      return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    }
    const membership = await repository.findActiveMembership(parsed.data.organizationId, localUserResult.value.id);
    if (membership === null || !membership.roleActive) {
      try {
        await new DrizzleDashboardRepository(runtime.db).recordDenied({
          actorType: 'user', actorId: localUserResult.value.id, verifiedAuthUserId: identity.authUserId, organizationId: parsed.data.organizationId,
          permissionSet: new Set(), entryPoint: 'dashboard', requestId,
        }, 'dashboard.organization.switch', 'organization');
      } catch {
        return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', requestId), { status: 503 });
      }
      return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    }
  } finally {
    await runtime.close();
  }

  cookieStore.set('indicate-active-organization', parsed.data.organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return NextResponse.json({ organizationId: parsed.data.organizationId }, { status: 200 });
}

export const POST = withApiAccess('POST /api/dashboard/active-organization', handlePOST);
