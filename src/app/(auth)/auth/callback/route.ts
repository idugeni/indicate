import { after, type NextRequest, NextResponse } from 'next/server';
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

async function sendWelcomeEmail(identity: { readonly authUserId: string; readonly email: string; readonly displayName: string }): Promise<void> {
  try {
    const production = await createProductionIntegrationsContext();
    await production.emailWelcome.welcome(identity);
  } catch {
    return;
  }
}

/**
 * Resolve the OTP verification type for a callback link.
 *
 * @param tokenType - Raw `type` query param from the Supabase email link.
 * @returns Supported verification type; unknown types fall back to email codes.
 */
export function resolveTokenKind(tokenType: string | null): 'email' | 'signup' | 'magiclink' | 'recovery' {
  return tokenType === 'signup' || tokenType === 'magiclink' || tokenType === 'recovery' ? tokenType : 'email';
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

  const tokenKind = resolveTokenKind(tokenType);
  const exchanged = code
    ? await auth.exchangeCodeForSession(code)
    : await auth.verifyTokenHash(tokenHash, tokenKind);
  if (!exchanged) {
    return NextResponse.redirect(new URL('/sign-in?auth=unavailable', request.url), { status: 303 });
  }

  if (authType === 'signup') {
    const identity = await auth.verifyCookieSession();
    const email = identity?.email ?? null;
    if (identity !== null && email !== null) {
      after(() => sendWelcomeEmail({ authUserId: identity.authUserId, email, displayName: identity.displayName }));
    }
  }

  const fallback = resolveCallbackDestination(authType, next);
  return NextResponse.redirect(new URL(fallback, request.url), { status: 303 });
}