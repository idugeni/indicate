import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

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
 */
export async function nextWithSessionRefresh(
  request: NextRequest,
  buildResponse: () => NextResponse,
): Promise<NextResponse> {
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
    await supabase.auth.getUser();
  } catch {
    return response;
  }
  return response;
}
