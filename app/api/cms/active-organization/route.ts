import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/application/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/config/public';
import { getRuntimeConfig } from '@/config/server';
import { createSupabaseSsrAuthAdapter } from '@/infrastructure/auth/supabase-ssr';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleAuthorizationRepository } from '@/infrastructure/db/repositories/drizzle-authorization-repository';
import { DrizzleStage3Repository } from '@/infrastructure/db/repositories/drizzle-stage3-repository';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { createNonDisclosingDenial, createPublicError } from '@/shared/errors/application-error';

const commandSchema = z.object({ organizationId: z.uuid() });
const e2eOrganizations = new Set([
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
]);
const isE2eMode = () => process.env.APP_ENVIRONMENT === 'test'
  && process.env.STAGE2_E2E_MODE === '1';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const cookieStore = await cookies();

  if (isE2eMode()) {
    const authenticated = cookieStore.get('indicate-stage2-session')?.value === 'stage2-valid';
    if (!authenticated || !e2eOrganizations.has(parsed.data.organizationId)) {
      return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    }
  } else {
    const publicConfig = getPublicConfig(process.env);
    const auth = createSupabaseSsrAuthAdapter({
      url: publicConfig.supabaseUrl,
      anonKey: publicConfig.supabaseAnonKey,
      cookies: {
        getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
        setAll: (values) => {
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        },
      },
    });
    const identity = await auth.verifyCookieSession();
    if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const runtime = createRuntimeDatabase(getRuntimeConfig());
    try {
      const repository = new DrizzleAuthorizationRepository(runtime.db);
      const localUserResult = await resolveVerifiedLocalUser(identity, repository, new UuidGenerator());
      if (!localUserResult.ok) {
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
      const membership = await repository.findActiveMembership(parsed.data.organizationId, localUserResult.value.id);
      if (membership === null || !membership.roleActive) {
        try {
          await new DrizzleStage3Repository(runtime.db).recordDenied({
            actorType: 'user', actorId: localUserResult.value.id, verifiedAuthUserId: identity.authUserId, organizationId: parsed.data.organizationId,
            permissionSet: new Set(), entryPoint: 'cms', requestId,
          }, 'cms.organization.switch', 'organization');
        } catch {
          return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', requestId), { status: 503 });
        }
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
    } finally {
      await runtime.close();
    }
  }

  cookieStore.set('indicate-active-organization', parsed.data.organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return NextResponse.json({ organizationId: parsed.data.organizationId }, { status: 200 });
}
