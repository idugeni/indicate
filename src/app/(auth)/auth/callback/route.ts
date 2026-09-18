import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getPublicConfig } from '@/core/config/public-config';
import { createHardenedSupabaseCookieStore, createSupabaseSsrAuthAdapter } from '@/integrations/supabase/supabase-ssr';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { safeRedirectPath } from '@/core/security/safe-redirect-path';

function withSupabaseCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createHardenedSupabaseCookieStore({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  });
}

type CallbackAuth = ReturnType<typeof createSupabaseSsrAuthAdapter>;

async function welcomeConfirmedSignup(auth: CallbackAuth): Promise<void> {
  try {
    const production = await createProductionIntegrationsContext();
    const identity = await auth.verifyCookieSession();
    if (identity === null || identity.email === null) return;
    await production.emailWelcome.welcome({ authUserId: identity.authUserId, email: identity.email, displayName: identity.displayName });
  } catch {
    return;
  }
}

/**
 * Resolve the post-callback redirect target.
 *
 * @param authType - Auth flow type after email normalization (null for email links).
 * @param next - Raw next param, or null when absent.
 * @returns Fallback per flow when next is absent, otherwise the sanitized path.
 */
export function resolveCallbackDestination(authType: string | null, next: string | null): string {
  const fallback = authType === 'recovery' ? '/update-password' : '/dashboard';
  return next === null ? fallback : safeRedirectPath(next);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code') ?? '';
  const tokenHash = request.nextUrl.searchParams.get('token_hash') ?? '';
  const tokenType = request.nextUrl.searchParams.get('type');
  const next = request.nextUrl.searchParams.get('next');
  const authType = tokenType === 'email' ? null : tokenType;
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.supabasePublishableKey,
    cookies: withSupabaseCookies(cookieStore),
  });

  const tokenKind = tokenType === 'signup' || tokenType === 'recovery' ? tokenType : 'email';
  const exchanged = code
    ? await auth.exchangeCodeForSession(code)
    : await auth.verifyTokenHash(tokenHash, tokenKind);
  if (!exchanged) {
    return NextResponse.redirect(new URL('/sign-in?auth=unavailable', request.url), { status: 303 });
  }

  if (authType === 'signup') {
    await welcomeConfirmedSignup(auth);
  }

  const fallback = resolveCallbackDestination(authType, next);
  return NextResponse.redirect(new URL(fallback, request.url), { status: 303 });
}