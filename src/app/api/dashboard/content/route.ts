import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { getPublicConfig } from '@/core/config/public-config';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { ContentAdminAccessDeniedError, DrizzleContentAdminRepository } from '@/data/repos/content/admin';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

const testimonialSchema = z.object({
  id: z.uuid(),
  quote: z.string().trim().min(1).max(2000),
  author: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  media: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1000),
  active: z.boolean(),
}).strict();
const faqSchema = z.object({
  id: z.uuid(),
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(4000),
  sortOrder: z.number().int().min(0).max(1000),
  active: z.boolean(),
}).strict();
const showcaseSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(1000),
  active: z.boolean(),
}).strict();
const channelSchema = z.object({
  key: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(1000),
  href: z.string().trim().max(500).nullish(),
  sortOrder: z.number().int().min(0).max(1000),
}).strict();
const templateSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  category: z.enum(['news', 'editorial', 'tech', 'official', 'visual', 'live']),
}).strict();

const commandSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('testimonial.save'), row: testimonialSchema }),
  z.object({ action: z.literal('faq.save'), row: faqSchema }),
  z.object({ action: z.literal('showcase.save'), row: showcaseSchema }),
  z.object({ action: z.literal('channel.save'), row: channelSchema }),
  z.object({ action: z.literal('template.save'), row: templateSchema }),
  z.object({
    action: z.literal('row.delete'),
    kind: z.enum(['testimonial', 'faq', 'showcase', 'channel', 'template']),
    id: z.string().min(1).max(200),
  }),
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
    const repository = new DrizzleContentAdminRepository(runtime.db);
    try {
      return NextResponse.json(await repository.listContent(identity.authUserId, local.value.id));
    } catch {
      return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    }
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid content command.', requestId), { status: 400 });
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
    const repository = new DrizzleContentAdminRepository(runtime.db);
    try {
      const command = parsed.data;
      switch (command.action) {
        case 'testimonial.save': await repository.saveTestimonial(identity.authUserId, local.value.id, command.row); break;
        case 'faq.save': await repository.saveFaq(identity.authUserId, local.value.id, command.row); break;
        case 'showcase.save': await repository.saveShowcaseEntry(identity.authUserId, local.value.id, command.row); break;
        case 'channel.save': await repository.saveChannel(identity.authUserId, local.value.id, command.row); break;
        case 'template.save': await repository.saveTemplatePreset(identity.authUserId, local.value.id, command.row); break;
        case 'row.delete': await repository.deleteContentRow(identity.authUserId, local.value.id, command.kind, command.id); break;
      }
      // Konten marketing di-cache per jam (tag site-content): invalidasi segera
      // agar perubahan admin langsung tayang; kegagalan revalidasi tidak
      // menggagalkan mutasi (penyembuhan via expiry).
      try {
        revalidateTag('site-content', 'max');
      } catch {
        /* TTL 'hours' menyembuhkan; mutasi admin tetap sukses. */
      }
      return NextResponse.json({ ok: true });
    } catch (error) {
      if (error instanceof ContentAdminAccessDeniedError) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'The content operation could not be completed.', requestId), { status: 500 });
    }
  }
}

export { handleGET as GET, handlePOST as POST };
