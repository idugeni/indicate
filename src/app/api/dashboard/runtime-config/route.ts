import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/core/config/public-config';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext, invalidateServerRuntimeConfig } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleRuntimeConfigAdminRepository, RuntimeConfigAdminAccessDeniedError, RuntimeConfigAdminConflictError } from '@/data/repos/runtime-config/admin';
import { mediaPolicySchema } from '@/core/config/persisted/persisted-schema';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('media-policy.save'), policy: mediaPolicySchema }),
]);

async function handleGET() {
  const requestId = crypto.randomUUID();
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  {
    const authorization = new DrizzleAuthorizationRepository(runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
    if (!local.ok) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const repository = new DrizzleRuntimeConfigAdminRepository(runtime.db);
    try {
      const [policy, policies] = await Promise.all([
        repository.readMediaPolicy(identity.authUserId, local.value.id),
        repository.readPoliciesOverview(identity.authUserId, local.value.id),
      ]);
      return NextResponse.json({ policy, policies });
    } catch {
      return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    }
  }
}

/**
 * Map a runtime-config failure to its HTTP status.
 *
 * @param error - Error thrown by the runtime-config admin repository.
 * @returns Status honoring access denial (404) and version conflict (409).
 */
export function runtimeConfigErrorStatus(error: unknown): number {
  if (error instanceof RuntimeConfigAdminAccessDeniedError) return 404;
  if (error instanceof RuntimeConfigAdminConflictError) return 409;
  return 500;
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid runtime configuration command.', requestId), { status: 400 });
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  {
    const authorization = new DrizzleAuthorizationRepository(runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
    if (!local.ok) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const repository = new DrizzleRuntimeConfigAdminRepository(runtime.db);
    try {
      const policy = parsed.data.policy;
      const result = await repository.updateMediaPolicy(identity.authUserId, local.value.id, {
        allowedMimeTypes: [...policy.allowedMimeTypes],
        maxObjectBytes: policy.maxObjectBytes,
        uploadAuthorizationSeconds: policy.uploadAuthorizationSeconds,
        readAuthorizationSeconds: policy.readAuthorizationSeconds,
        expectedVersion: policy.version,
      });
      await invalidateServerRuntimeConfig(context.bootstrap.environment);
      return NextResponse.json({ ok: true, version: result.version });
    } catch (error) {
      if (error instanceof RuntimeConfigAdminAccessDeniedError) return NextResponse.json(createNonDisclosingDenial(requestId), { status: runtimeConfigErrorStatus(error) });
      if (error instanceof RuntimeConfigAdminConflictError) return NextResponse.json(createPublicError('CONFLICT', 'Kebijakan berubah sebelum penyimpanan. Muat ulang lalu coba lagi.', requestId), { status: runtimeConfigErrorStatus(error) });
      return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The runtime configuration operation could not be completed.', requestId), { status: runtimeConfigErrorStatus(error) });
    }
  }
}

export { handleGET as GET, handlePOST as POST };
