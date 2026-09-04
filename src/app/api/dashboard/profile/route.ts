import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/core/config/public-config';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

const AVATAR_KEY_PREFIX = 'avatars/';
const AVATAR_EXTENSIONS = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as const);

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request-upload'),
    contentType: z.string().min(1).max(100),
    checksumSha256: z.string().regex(/^[0-9a-f]{64}$/iu),
  }),
  z.object({
    action: z.literal('save-profile'),
    bio: z.string().trim().max(500).nullish(),
    locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/u).nullish(),
    timezone: z.string().trim().min(1).max(64).nullish(),
    avatar: z.union([
      z.object({ kind: z.literal('upload'), key: z.string().min(1).max(300) }),
      z.object({ kind: z.literal('url'), url: z.string().url().max(2000).refine((value) => value.startsWith('https://'), 'avatar URL must use https') }),
      z.object({ kind: z.literal('oauth') }),
      z.object({ kind: z.literal('remove') }),
      z.object({ kind: z.literal('keep') }),
    ]),
  }),
]);

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid profile command.', requestId), { status: 400 });
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey,
    cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }),
  });
  const identity = await auth.verifyCookieSession();
  if (identity === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await getServerRuntimeContext();
  const runtime = createRuntimeDatabase(context.bootstrap);
  try {
    const repository = new DrizzleAuthorizationRepository(runtime.db);
    const local = await resolveVerifiedLocalUser(identity, repository, new UuidGenerator());
    if (!local.ok) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const storage = new R2ObjectStorageAdapter({ accountId: context.config.r2.accountId, bucketName: context.config.r2.bucketName, accessKeyId: context.config.r2.accessKeyId, secretAccessKey: context.config.r2.secretAccessKey });
    if (parsed.data.action === 'request-upload') {
      const allowedTypes = context.config.r2.allowedTypes;
      const ext = (AVATAR_EXTENSIONS as Readonly<Record<string, string>>)[parsed.data.contentType];
      if (ext === undefined || !allowedTypes.includes(parsed.data.contentType)) {
        return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid profile command.', requestId), { status: 400 });
      }
      const key = `${AVATAR_KEY_PREFIX}${local.value.id}/avatar.${ext}`;
      const authorization = await storage.authorizeExactPut(key, parsed.data.contentType, parsed.data.checksumSha256, context.config.r2.uploadTtlSeconds);
      return NextResponse.json({ key, url: authorization.url, expiresAt: authorization.expiresAt.toISOString(), requiredHeaders: authorization.requiredHeaders });
    }
    const expectedPrefix = `${AVATAR_KEY_PREFIX}${local.value.id}/`;
    let avatarUrl: string | null | undefined;
    switch (parsed.data.avatar.kind) {
      case 'keep': avatarUrl = undefined; break;
      case 'remove': avatarUrl = null; break;
      case 'oauth': avatarUrl = identity.avatarUrl; break;
      case 'url': avatarUrl = parsed.data.avatar.url; break;
      case 'upload': {
        if (!parsed.data.avatar.key.startsWith(expectedPrefix)) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid profile command.', requestId), { status: 400 });
        if ((await storage.headExact(parsed.data.avatar.key)) === null) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid profile command.', requestId), { status: 400 });
        avatarUrl = `r2:${parsed.data.avatar.key}`;
        break;
      }
    }
    const updated = await repository.updateOwnProfile(identity.authUserId, {
      ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
      ...(parsed.data.locale !== undefined ? { locale: parsed.data.locale } : {}),
      ...(parsed.data.timezone !== undefined ? { timezone: parsed.data.timezone } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    });
    if (updated === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    return NextResponse.json({ avatarUrl: updated.avatarUrl });
  } finally {
    await runtime.close();
  }
}

export { handlePOST as POST };
