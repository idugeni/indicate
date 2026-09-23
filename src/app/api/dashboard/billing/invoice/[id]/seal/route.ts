import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { BillingService } from '@/modules/billing/billing-service';
import { watermarkStamp } from '@/modules/billing/seal-watermark';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

const querySchema = z.object({ organizationId: z.uuid(), type: z.enum(['sign', 'stamp']) });

const SEAL_KEYS = {
  sign: 'seals/safenca-ttd-direktur-transparent.png',
  stamp: 'seals/safenca-stamp-lunas-transparent.png',
} as const;

const SEAL_FALLBACK_FILES = {
  sign: 'safenca-ttd-direktur-transparent.png',
  stamp: 'safenca-stamp-lunas-transparent.png',
} as const;

async function handleGET(request: Request, context: { readonly params: Promise<{ readonly id: string }> }) {
  const requestId = resolveRequestId(request);
  const { id } = await context.params;
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get('organizationId'),
    type: url.searchParams.get('type'),
  });
  if (!parsed.success) return new Response('Not Found', { status: 404 });
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return new Response('Not Found', { status: 404 });
  const serverContext = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(serverContext.bootstrap);
  {
    const authorization = new DrizzleAuthorizationRepository(runtime.db);
    const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
    if (!local.ok || local.value.status !== 'active') return new Response('Not Found', { status: 404 });
    const platformPermissions = await authorization.listPlatformPermissions(local.value.id);
    const actor = {
      actorType: 'user' as const, actorId: local.value.id, verifiedAuthUserId: identity.authUserId,
      organizationId: null, permissionSet: new Set<string>(), platformPermissionSet: new Set(platformPermissions),
      entryPoint: 'dashboard' as const, requestId,
    };
    const service = new BillingService(new DrizzleBillingRepository(runtime.db));
    const result = await service.invoiceDetail(actor, parsed.data.organizationId, id);
    if (!result.ok) return new Response('Not Found', { status: 404 });
    const storage = new R2ObjectStorageAdapter({
      accountId: serverContext.config.r2.accountId, bucketName: serverContext.config.r2.bucketName,
      publicBucketName: serverContext.config.r2.publicBucketName,
      accessKeyId: serverContext.config.r2.accessKeyId, secretAccessKey: serverContext.config.r2.secretAccessKey,
    });
    try {
      const object = await storage.getExact(SEAL_KEYS[parsed.data.type]);
      if (object !== null) {
        const body = parsed.data.type === 'stamp' ? await watermarkStamp(object.body, result.value.number) : object.body;
        return new Response(Buffer.from(body), {
          headers: {
            'Content-Type': object.contentType,
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Robots-Tag': 'noindex, noimageindex',
          },
        });
      }
    } catch {
      return new Response('Not Found', { status: 404 });
    }
    try {
      const fallback = await readFile(join(process.cwd(), 'public', 'brand', SEAL_FALLBACK_FILES[parsed.data.type]));
      return new Response(new Uint8Array(fallback), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, noimageindex',
        },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  }
}

export const GET = withApiAccess('GET /api/dashboard/billing/invoice/[id]/seal', handleGET);
