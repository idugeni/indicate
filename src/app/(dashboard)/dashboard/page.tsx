import { Suspense } from 'react';
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
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { DashboardWorkspace, type OrganizationOption } from '@/modules/dashboard/components/dashboard-workspace';
import { RedeemInviteForm } from '@/modules/dashboard/components/billing/redeem-invite-form';
import { SignOutDialog } from '@/modules/dashboard/components/sign-out-dialog';
import DashboardLoading from '../loading';

async function resolveDisplayAvatarUrl(
  stored: string | null,
  context: Awaited<ReturnType<typeof getServerRuntimeContext>>,
): Promise<string | null> {
  if (stored === null) return null;
  if (stored.startsWith('https://')) return stored;
  if (!stored.startsWith('r2:')) return null;
  try {
    const storage = new R2ObjectStorageAdapter({ accountId: context.config.r2.accountId, bucketName: context.config.r2.bucketName, accessKeyId: context.config.r2.accessKeyId, secretAccessKey: context.config.r2.secretAccessKey });
    const authorization = await storage.authorizeExactGet(stored.slice('r2:'.length), context.config.r2.readTtlSeconds);
    return authorization.url;
  } catch {
    return null;
  }
}

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
  let avatarUrl: string | null = null;
  let organizations: readonly OrganizationOption[] = [];
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
  const identity = await auth.verifyCookieSession(); if (identity === null) redirect('/sign-in');
  const displayName = identity.displayName;
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const repository = new DrizzleAuthorizationRepository(runtime.db);
  const discovery = await resolveVerifiedUserOrganizations(identity, repository, new UuidGenerator()); if (!discovery.ok) redirect('/sign-in');
  const localUserId = discovery.value.localUser.id;
  avatarUrl = await resolveDisplayAvatarUrl(discovery.value.localUser.avatarUrl ?? identity.avatarUrl, context);
  const withTiers = await Promise.all(
    discovery.value.organizations.map(async ({ id, name }): Promise<OrganizationOption> => {
      const membership = await repository.findActiveMembership(id, localUserId);
      return {
        id,
        name,
        records: [],
        ...(membership === null
          ? {}
          : {
            role: membership.roleTier,
            permissions: [...membership.orgPermissions, ...membership.platformPermissions],
          }),
      };
    }),
  );
  organizations = withTiers;
  const selected = z.uuid().safeParse(cookieStore.get('indicate-active-organization')?.value);
  if (selected.success && organizations.some(({ id }) => id === selected.data)) {
    organizations = [organizations.find(({ id }) => id === selected.data)!, ...organizations.filter(({ id }) => id !== selected.data)];
  }
  // Prefetch the default snapshot for first-paint data; null falls back to live-fetch.
  if (organizations.length === 0) {
    return (
      <main className="mx-auto flex min-h-[70svh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="m-0 font-mono text-xs uppercase tracking-wider text-brass">Akun aktif</p>
        <h1 className="mt-3 font-sans text-2xl font-bold tracking-tight text-paper sm:text-3xl">
          Halo, {displayName} — akun Anda belum terhubung ke organisasi mana pun.
        </h1>
        <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-paper-dim">
          Minta admin platform menetapkan Anda sebagai admin pertama organisasi Anda, atau hubungi tim penjualan bila
          Anda pelanggan baru. Begitu keanggotaan aktif, dasbor redaksi langsung tersedia di halaman ini.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded bg-brass px-5 py-2.5 font-sans text-sm font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft"
          >
            Hubungi Kami
          </a>
          <a
            href="/pricing"
            className="inline-flex items-center justify-center rounded border border-hairline-strong bg-transparent px-5 py-2.5 font-sans text-sm font-medium text-paper-dim transition-colors duration-180 hover:text-paper"
          >
            Lihat Info Harga
          </a>
          <SignOutDialog mode="button" />
        </div>
        <RedeemInviteForm />
      </main>
    );
  }
  const firstOrganization = organizations[0];
  const initialDashboard =
    firstOrganization === undefined ? null : await getDashboardSnapshot(firstOrganization.id, identity);
  return <DashboardWorkspace displayName={displayName} avatarUrl={avatarUrl} organizations={organizations} initialDashboard={initialDashboard} />;
}
