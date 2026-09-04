'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { orgTag } from '@/modules/dashboard/cache-tags';
import { getPublicConfig } from '@/core/config/public-config';
import { isProductionServer } from '@/core/config/runtime/runtime-flags';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteHeaders } from '@/core/security/mutation-guard';
import { UuidGenerator } from '@/core/system/uuid-generator';

const inputSchema = z.object({ organizationId: z.uuid() });

/** Discriminated `useActionState` result; failures stay non-disclosing to block org enumeration. */
export type SwitchOrganizationState =
  | { readonly status: 'idle' }
  | { readonly status: 'ok'; readonly organizationId: string }
  | { readonly status: 'error'; readonly message: string };

const DENIED: SwitchOrganizationState = Object.freeze({
  status: 'error',
  message: 'Permintaan beralih organisasi tidak dapat diproses.',
});

function writeActiveOrganizationCookie(
  set: (name: string, value: string, options: { httpOnly: true; sameSite: 'lax'; secure: boolean; path: string }) => void,
  organizationId: string,
): void {
  set('indicate-active-organization', organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProductionServer(),
    path: '/',
  });
}

/** Server Action replacing the active-org fetch; audits before mutation, purges both org tags on success. */
export async function switchActiveOrganization(
  previousState: SwitchOrganizationState,
  formData: FormData,
): Promise<SwitchOrganizationState> {
  const requestId = crypto.randomUUID();
  const headerList = await headers();
  if (denyCrossSiteHeaders((name) => headerList.get(name))) return DENIED;

  const parsed = inputSchema.safeParse({ organizationId: formData.get('organizationId') });
  if (!parsed.success) return DENIED;
  const organizationId = parsed.data.organizationId;
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
  if (identity === null) return DENIED;
  const context = await getServerRuntimeContext();
  const runtime = createRuntimeDatabase(context.bootstrap);
  try {
    const repository = new DrizzleAuthorizationRepository(runtime.db);
    const localUserResult = await resolveVerifiedLocalUser(identity, repository, new UuidGenerator());
    if (!localUserResult.ok) return DENIED;
    const membership = await repository.findActiveMembership(organizationId, localUserResult.value.id);
    if (membership === null || !membership.roleActive) {
      try {
        await new DrizzleDashboardRepository(runtime.db).recordDenied(
          {
            actorType: 'user',
            actorId: localUserResult.value.id,
            verifiedAuthUserId: identity.authUserId,
            organizationId,
            permissionSet: new Set(),
            entryPoint: 'dashboard',
            requestId,
          },
          'dashboard.organization.switch',
          'organization',
        );
      } catch {
        return DENIED;
      }
      return DENIED;
    }
  } finally {
    await runtime.close();
  }

  const previous = cookieStore.get('indicate-active-organization')?.value;
  try {
    writeActiveOrganizationCookie(
      (name, value, options) => cookieStore.set(name, value, options),
      organizationId,
    );
  } catch {
    return DENIED;
  }

  if (previous !== undefined && previous !== organizationId) revalidateTag(orgTag(previous), 'max');
  revalidateTag(orgTag(organizationId), 'max');
  revalidatePath('/dashboard');
  return { status: 'ok', organizationId };
}
