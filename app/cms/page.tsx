import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { resolveVerifiedUserOrganizations } from '@/application/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/config/public';
import { getRuntimeConfig } from '@/config/server';
import { createSupabaseSsrAuthAdapter } from '@/infrastructure/auth/supabase-ssr';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleAuthorizationRepository } from '@/infrastructure/db/repositories/drizzle-authorization-repository';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { CmsWorkspace, type OrganizationOption } from './cms-workspace';

const E2E_ORGANIZATIONS: readonly OrganizationOption[] = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Organization Alpha', records: ['Alpha domain', 'Alpha site'] },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Organization Beta', records: ['Beta domain'] },
];
const isE2eMode = () => process.env.APP_ENVIRONMENT === 'test' && process.env.STAGE2_E2E_MODE === '1';

export default async function CmsPage() {
  const cookieStore = await cookies();
  let displayName: string;
  let organizations: readonly OrganizationOption[] = [];
  if (isE2eMode()) {
    if (cookieStore.get('indicate-stage2-session')?.value !== 'stage2-valid') redirect('/sign-in');
    displayName = 'Stage 2 Test Editor'; organizations = E2E_ORGANIZATIONS;
  } else {
    const publicConfig = getPublicConfig(process.env);
    const auth = createSupabaseSsrAuthAdapter({
      url: publicConfig.supabaseUrl, anonKey: publicConfig.supabaseAnonKey,
      cookies: { getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), setAll: (values) => { try { for (const { name, value, options } of values) cookieStore.set(name, value, options); } catch { /* refreshed by proxy */ } } },
    });
    const identity = await auth.verifyCookieSession(); if (identity === null) redirect('/sign-in');
    displayName = identity.displayName;
    const runtime = createRuntimeDatabase(getRuntimeConfig());
    try {
      const repository = new DrizzleAuthorizationRepository(runtime.db);
      const discovery = await resolveVerifiedUserOrganizations(identity, repository, new UuidGenerator()); if (!discovery.ok) redirect('/sign-in');
      organizations = discovery.value.organizations.map(({ id, name }) => ({ id, name, records: [] }));
      const selected = z.uuid().safeParse(cookieStore.get('indicate-active-organization')?.value);
      if (selected.success && organizations.some(({ id }) => id === selected.data)) {
        organizations = [organizations.find(({ id }) => id === selected.data)!, ...organizations.filter(({ id }) => id !== selected.data)];
      }
    } finally { await runtime.close(); }
  }
  return <CmsWorkspace displayName={displayName} organizations={organizations} />;
}
