import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { resolveVerifiedUserOrganizations } from '@/modules/auth/resolve-authenticated-user';
import { getDashboardSnapshot } from '@/modules/dashboard';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { DashboardWorkspace, type OrganizationOption } from '@/modules/dashboard/components/dashboard-workspace';
import { Button } from '@/components/ui/button';
import { DashboardFooter } from '@/modules/dashboard/components/dashboard-footer';
import { RedeemInviteForm } from '@/modules/dashboard/components/billing/redeem-invite-form';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';
import DashboardLoading from '@/app/(dashboard)/loading';

/**
 * Render dashboard workspace shell.
 *
 * @remarks Prefetch the default snapshot for first-paint data; null falls back to live-fetch.
 */
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardBody />
    </Suspense>
  );
}

async function DashboardBody() {
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
  const identity = await auth.verifyCookieSession(); if (identity === null) redirect('/sign-in?auth=required');
  const displayName = identity.displayName;
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleAuthorizationRepository(runtime.db);
  const discovery = await resolveVerifiedUserOrganizations(identity, repository, new UuidGenerator()); if (!discovery.ok) redirect('/sign-in?auth=inactive');
  const localUser = discovery.value.localUser;
  const memberships = await repository.findActiveMemberships(
    localUser.id,
    discovery.value.organizations.map(({ id }) => id),
  );
  let organizations: readonly OrganizationOption[] = discovery.value.organizations.map(({ id, name }) => {
    const membership = memberships.get(id);
    return {
      id,
      name,
      records: [],
      ...(membership === undefined
        ? {}
        : {
          role: membership.roleTier,
          permissions: [...membership.orgPermissions, ...membership.platformPermissions],
        }),
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
            <Button variant="default" size="lg" className="px-5" render={<Link href="/contact">Hubungi Kami</Link>} />
            <Button variant="outline" size="lg" className="px-5" render={<Link href="/pricing">Lihat Info Harga</Link>} />
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
  const initialDashboard = firstOrganization === undefined
    ? null
    : firstMembership === undefined
      ? await getDashboardSnapshot(firstOrganization.id, identity)
      : await getDashboardSnapshot(firstOrganization.id, identity, { localUser, membership: firstMembership });
  const avatarRef = localUser.avatarUrl ?? identity.avatarUrl;
  return <DashboardWorkspace displayName={displayName} avatarUrl={avatarRef} organizations={organizations} initialDashboard={initialDashboard} />;
}
