import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { resolveVerifiedUserOrganizations } from '@/modules/auth/resolve-authenticated-user';
import type { MembershipAuthorization } from '@/modules/auth/rbac';
import { DASHBOARD_ACCESS_KEY_COOKIE } from '@/modules/auth/dashboard-access-keys/cookie';
import { resolveAccessKeyActor } from '@/modules/auth/dashboard-access-keys/resolve-access-key-actor';
import { getDashboardSnapshot } from '@/modules/dashboard';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { DashboardWorkspace, type OrganizationOption } from '@/modules/dashboard/components/dashboard-workspace';
import { DASHBOARD_PERMISSION_NAMES } from '@/modules/dashboard/permissions';
import { PUBLISHING_PERMISSION_NAMES } from '@/modules/publishing/permissions';
import { INTEGRATIONS_PERMISSIONS, INTEGRATIONS_PLATFORM_PERMISSION_NAMES, INTEGRATIONS_TENANT_PERMISSION_NAMES } from '@/modules/integrations/permissions';
import { buttonVariants } from '@/components/ui/button';
import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';
import { RedeemInviteForm } from '@/modules/dashboard/components/billing/redeem-invite-form';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';
import { cn } from '@/ui/cn';
import DashboardLoading from '@/app/(dashboard)/loading';

/**
 * Render dashboard workspace shell.
 *
 * @param props.searchParams - Query params; `view` decides snapshot need.
 * @remarks Prefetch the default snapshot for first-paint data; null falls back to live-fetch.
 * Snapshot hanya berguna untuk view dashboard: view lain (termasuk self-fetching)
 * langsung fetch via API/panel sehingga snapshot dilewati agar tidak bayar DB sia-sia.
 */
export default function DashboardPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly view?: string | readonly string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardBody searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardBody({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly view?: string | readonly string[] | undefined }>;
}) {
  await connection();
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({
      getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
      set: (name, value, options) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          /* Cookie write can fail during RSC render; the proxy refreshes it. */
        }
      },
    }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return <AccessKeyDashboardBody cookieStore={cookieStore} searchParams={searchParams} />;
  const displayName = identity.displayName;
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleAuthorizationRepository(runtime.db);
  const discovery = await resolveVerifiedUserOrganizations(identity, repository, new UuidGenerator()); if (!discovery.ok) redirect('/sign-in?auth=inactive');
  const localUser = discovery.value.localUser;
  const resolvedPlatformPermissions: readonly string[] = await repository.listPlatformPermissions(localUser.id).catch((): readonly string[] => []);
  const isPlatformSuperAdmin = resolvedPlatformPermissions.includes(INTEGRATIONS_PERMISSIONS.superAdmin);
  const platformPermissions: readonly string[] = isPlatformSuperAdmin ? INTEGRATIONS_PLATFORM_PERMISSION_NAMES : resolvedPlatformPermissions;
  const memberships: ReadonlyMap<string, MembershipAuthorization> = isPlatformSuperAdmin
    ? new Map<string, MembershipAuthorization>()
    : await repository.findActiveMemberships(
      localUser.id,
      discovery.value.organizations.map(({ id }) => id),
    );
  const platformAdminTenantPermissions = [
    ...DASHBOARD_PERMISSION_NAMES,
    ...PUBLISHING_PERMISSION_NAMES,
    ...INTEGRATIONS_TENANT_PERMISSION_NAMES,
    INTEGRATIONS_PERMISSIONS.siteSettingsManage,
  ];
  let organizations: readonly OrganizationOption[] = discovery.value.organizations.map(({ id, name }) => {
    const membership = memberships.get(id);
    return {
      id,
      name,
      ...(isPlatformSuperAdmin
        ? { role: 'superadmin' as const, permissions: [...platformAdminTenantPermissions, ...platformPermissions] }
        : membership === undefined
          ? {}
          : { role: membership.roleTier, permissions: [...membership.orgPermissions, ...membership.platformPermissions] }),
    };
  });
  const selected = z.uuid().safeParse(cookieStore.get('indicate-active-organization')?.value);
  if (selected.success && organizations.some(({ id }) => id === selected.data)) {
    organizations = [organizations.find(({ id }) => id === selected.data)!, ...organizations.filter(({ id }) => id !== selected.data)];
  }
  if (organizations.length === 0) {
    return (
      <div className="flex min-h-screen supports-[min-height:100svh]:min-h-svh flex-col bg-bg text-paper">
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <p className="m-0 font-mono text-xs uppercase tracking-wider text-brass">Akun aktif</p>
          <h1 className="mt-3 font-sans text-2xl font-bold tracking-tight text-paper sm:text-3xl">
            Halo, {displayName} — akun Anda belum terhubung ke organisasi mana pun.
          </h1>
          <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-paper-dim">
            Minta admin platform menetapkan Anda sebagai admin pertama organisasi Anda, atau hubungi tim penjualan bila
            Anda pelanggan baru. Begitu keanggotaan aktif, dasbor redaksi langsung tersedia di halaman ini.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact" className={cn(buttonVariants({ size: 'lg' }), 'px-5')}>
              Hubungi Kami
            </Link>
            <Link href="/pricing" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-5')}>
              Lihat Info Harga
            </Link>
            <SignOutDialog mode="button" />
          </div>
          <RedeemInviteForm />
        </main>
        <DashboardFooter />
      </div>
    );
  }
  const firstOrganization = organizations[0];
  const firstMembership = firstOrganization === undefined ? undefined : memberships.get(firstOrganization.id);
  const resolvedParams = searchParams === undefined ? undefined : await searchParams;
  const rawView = Array.isArray(resolvedParams?.view) ? resolvedParams?.view[0] : resolvedParams?.view;
  const needsSnapshot = rawView === undefined || rawView === 'dashboard';
  const initialDashboard = !needsSnapshot || firstOrganization === undefined || isPlatformSuperAdmin
    ? null
    : firstMembership === undefined
      ? await getDashboardSnapshot(firstOrganization.id, identity)
      : await getDashboardSnapshot(firstOrganization.id, identity, { localUser, membership: firstMembership });
  const avatarRef = localUser.avatarUrl ?? identity.avatarUrl;
  return <DashboardWorkspace displayName={displayName} avatarUrl={avatarRef} organizations={organizations} initialDashboard={initialDashboard} />;
}

async function AccessKeyDashboardBody({ cookieStore, searchParams }: { readonly cookieStore: Awaited<ReturnType<typeof cookies>>; readonly searchParams?: Promise<{ readonly view?: string | readonly string[] | undefined }> | undefined }) {
  const bearer = cookieStore.get(DASHBOARD_ACCESS_KEY_COOKIE)?.value ?? null;
  if (bearer === null) redirect('/sign-in?auth=required');
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const resolved = await resolveAccessKeyActor(runtime.db, bearer, crypto.randomUUID(), new Date()).catch(() => null);
  if (resolved === null) redirect('/sign-in?auth=required');
  const repository = new DrizzleAuthorizationRepository(runtime.db);
  const isPlatformSuperAdmin = resolved.actor.platformPermissionSet?.has(INTEGRATIONS_PERMISSIONS.superAdmin) === true;
  const organizationsForUser = await repository.listActiveOrganizationsForUser(resolved.identity.authUserId);
  const bound = organizationsForUser.find(({ id }) => id === resolved.actor.organizationId);
  if (bound === undefined) redirect('/sign-in?auth=inactive');
  const platformAdminTenantPermissions = [
    ...DASHBOARD_PERMISSION_NAMES,
    ...PUBLISHING_PERMISSION_NAMES,
    ...INTEGRATIONS_TENANT_PERMISSION_NAMES,
    INTEGRATIONS_PERMISSIONS.siteSettingsManage,
  ];
  const organizations: readonly OrganizationOption[] = isPlatformSuperAdmin
    ? organizationsForUser.map(({ id, name }) => ({
      id,
      name,
      role: 'superadmin' as const,
      permissions: [...platformAdminTenantPermissions, ...(resolved.actor.platformPermissionSet ?? [])],
    }))
    : [{
      id: bound.id,
      name: bound.name,
      role: resolved.membership.roleTier,
      permissions: [...resolved.membership.orgPermissions],
    }];
  const sessionIdentity = {
    authUserId: resolved.identity.authUserId,
    displayName: resolved.displayName,
    avatarUrl: resolved.avatarUrl,
    email: null,
  };
  const resolvedParams = searchParams === undefined ? undefined : await searchParams;
  const rawView = Array.isArray(resolvedParams?.view) ? resolvedParams?.view[0] : resolvedParams?.view;
  const needsSnapshot = rawView === undefined || rawView === 'dashboard';
  const initialDashboard = !needsSnapshot || isPlatformSuperAdmin
    ? null
    : await getDashboardSnapshot(bound.id, sessionIdentity, {
      localUser: resolved.localUser,
      membership: resolved.membership,
    });
  return (
    <DashboardWorkspace
      displayName={resolved.displayName}
      avatarUrl={resolved.localUser.avatarUrl ?? resolved.avatarUrl}
      organizations={organizations}
      initialDashboard={initialDashboard}
    />
  );
}
