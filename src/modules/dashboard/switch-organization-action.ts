'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { orgTag } from '@/modules/dashboard/cache-tags';
import { isProductionServer } from '@/core/config/runtime/runtime-flags';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { denyCrossSiteHeaders } from '@/core/security/mutation-guard';

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

/** Server Action using the shared dashboard auth resolver for sessions and access-key bearers. */
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
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);

  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId).catch(() => null);
  if (user === null) return DENIED;

  const repository = new DrizzleAuthorizationRepository(runtime.db);
  const accessibleOrganizations = await repository
    .listActiveOrganizationsForUser(user.authUserId, organizationId)
    .catch(() => []);
  const targetIsActiveAndAccessible = accessibleOrganizations.some((organization) => organization.id === organizationId);
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId).catch(() => null);

  if (!targetIsActiveAndAccessible || actor === null) {
    try {
      await new DrizzleDashboardRepository(runtime.db).recordDenied(
        {
          actorType: 'user',
          actorId: user.localUserId,
          verifiedAuthUserId: user.authUserId,
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
