import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import { installSupabaseAuthNoiseFilter, isDeadSessionError, isSupabaseSessionCookieName } from '@/integrations/supabase/supabase-auth-recovery';

/**
 * Refresh the Supabase cookie session at the edge and persist rotated cookies.
 *
 * @param request - Incoming edge request carrying the session cookies.
 * @param buildResponse - Builds the downstream response to attach refreshed cookies to.
 * @returns The downstream response, with rotated session cookies when a refresh happened.
 * @remarks Edge-safe on purpose: no `server-only` import, which the edge runtime
 * rejects. Cookie hardening mirrors `createHardenedSupabaseCookieStore` while
 * preserving Supabase's own expiry. Fail-open by design — page-level session
 * checks still redirect unauthenticated users when refresh is impossible.
 * Dead refresh tokens expire their cookies on the response so later requests
 * stop retrying a refresh that cannot succeed.
 */
export async function nextWithSessionRefresh(
  request: NextRequest,
  buildResponse: () => NextResponse,
): Promise<NextResponse> {
  installSupabaseAuthNoiseFilter();
  const response = buildResponse();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return response;
  try {
    const supabase = createServerClient(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, {
              ...(options.expires === undefined ? {} : { expires: options.expires }),
              ...(options.maxAge === undefined ? {} : { maxAge: options.maxAge }),
              path: '/',
              httpOnly: true,
              sameSite: 'lax',
              ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
            });
          }
        },
      },
    });
    const { error } = await supabase.auth.getUser();
    if (isDeadSessionError(error)) clearDeadSessionCookies(request, response);
  } catch {
    return response;
  }
  return response;
}

function clearDeadSessionCookies(request: NextRequest, response: NextResponse): void {
  const secure = process.env.NODE_ENV === 'production';
  for (const { name } of request.cookies.getAll()) {
    if (!isSupabaseSessionCookieName(name)) continue;
    response.cookies.set(name, '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 0,
      ...(secure ? { secure: true } : {}),
    });
  }
}
