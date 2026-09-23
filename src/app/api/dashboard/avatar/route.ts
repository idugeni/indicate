import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial } from '@/core/errors';

const querySchema = z.object({ ref: z.string().min(1).max(500) });

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ ref: url.searchParams.get('ref') ?? undefined });
  if (!parsed.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  if (!parsed.data.ref.startsWith('r2:')) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
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
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const local = await resolveVerifiedLocalUser(identity, new DrizzleAuthorizationRepository(runtime.db), new UuidGenerator());
  if (!local.ok) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  try {
    const storage = new R2ObjectStorageAdapter({ accountId: context.config.r2.accountId, bucketName: context.config.r2.bucketName, publicBucketName: context.config.r2.publicBucketName, accessKeyId: context.config.r2.accessKeyId, secretAccessKey: context.config.r2.secretAccessKey });
    const authorization = await storage.authorizeExactGet(parsed.data.ref.slice('r2:'.length), context.config.r2.readTtlSeconds);
    return NextResponse.json({ url: authorization.url });
  } catch {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }
}

/**
 * Resolve the signed avatar URL for the session owner outside the RSC critical path.
 *
 * @remarks Accepts only private `r2:` references; public https avatars never reach this route.
 */
export const GET = withApiAccess('GET /api/dashboard/avatar', handleGET);
