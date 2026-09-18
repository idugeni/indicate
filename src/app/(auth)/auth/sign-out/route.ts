import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getPublicConfig } from '@/core/config/public-config';
import { createHardenedSupabaseCookieStore, createSupabaseSsrAuthAdapter } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { safeRedirectPath } from '@/core/security/safe-redirect-path';
import { createNonDisclosingDenial } from '@/core/errors';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

function withSupabaseCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createHardenedSupabaseCookieStore({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  });
}

/**
 * Resolve the post-sign-out redirect target.
 *
 * @param rawNext - Raw next param, or null when absent.
 * @returns Sanitized path, defaulting to sign-in.
 */
export function resolveSignOutDestination(rawNext: string | null): string {
  return rawNext === null ? '/sign-in' : safeRedirectPath(rawNext);
}

async function handlePOST(request: NextRequest) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({
    url: publicConfig.supabaseUrl,
    publishableKey: publicConfig.supabasePublishableKey,
    cookies: withSupabaseCookies(cookieStore),
  });
  await auth.signOut();
  const rawNext = request.nextUrl.searchParams.get('next');
  const destination = resolveSignOutDestination(rawNext);
  return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
}

export const POST = withApiAccess('POST /auth/sign-out', handlePOST);