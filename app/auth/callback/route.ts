import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getPublicConfig } from '@/config/public';
import { createSupabaseSsrAuthAdapter } from '@/infrastructure/auth/supabase-ssr';
import { safeRedirectPath } from '@/shared/security/safe-redirect-path';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const nextPath = safeRedirectPath(request.nextUrl.searchParams.get('next'));
  const cookieStore = await cookies();
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
  const exchanged = await auth.exchangeCodeForSession(code);
  const destination = new URL(exchanged ? nextPath : '/?auth=unavailable', request.url);
  return NextResponse.redirect(destination, { status: 303 });
}
