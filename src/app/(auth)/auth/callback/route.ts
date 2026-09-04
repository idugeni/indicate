import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getPublicConfig } from '@/core/config/public-config';
import { createHardenedSupabaseCookieStore, createSupabaseSsrAuthAdapter } from '@/integrations/supabase/supabase-ssr';
import { safeRedirectPath } from '@/core/security/safe-redirect-path';

function withSupabaseCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createHardenedSupabaseCookieStore({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const next = request.nextUrl.searchParams.get('next');
  const authType = request.nextUrl.searchParams.get('type');
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.supabasePublishableKey,
    cookies: withSupabaseCookies(cookieStore),
  });

  const exchanged = await auth.exchangeCodeForSession(code);
  if (!exchanged) {
    return NextResponse.redirect(new URL('/sign-in?auth=unavailable', request.url), { status: 303 });
  }

  const fallback = authType === 'recovery' ? '/update-password' : '/dashboard';
  const destination = safeRedirectPath(next) || fallback;
  return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
}