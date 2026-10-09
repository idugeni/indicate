import { type NextRequest, NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { resolveAccessKeyActor } from '@/modules/auth/dashboard-access-keys/resolve-access-key-actor';
import { renderAccessKeyCookie } from '@/modules/auth/dashboard-access-keys/cookie';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createAccessKeyRedirect, resolveAccessKeyDestination } from './route-helpers';

const MAX_COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;



/**
 * Resolve the post-redeem landing page for a dashboard access key.
 *
 * @param to - Optional `?to=` view slug; unknown values fall back to editorial.
 * @returns Internal dashboard path; never an external URL.
 */

/**
 * Redeem a dashboard access key into a bearer cookie, then enter the editorial workspace.
 *
 * @param request - Incoming edge request carrying `?key=inda_...` and optional `?to=<view>`.
 * @returns 303 to the workspace on success, or to sign-in without disclosing why.
 */
async function handleGET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const plaintext = request.nextUrl.searchParams.get('key') ?? '';
  if (plaintext === '') {
    return createAccessKeyRedirect(new URL('/sign-in?auth=required', request.url));
  }
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const now = new Date();
  const resolved = await resolveAccessKeyActor(runtime.db, plaintext, requestId, now).catch(() => null);
  if (resolved === null) {
    return createAccessKeyRedirect(new URL('/sign-in?auth=required', request.url));
  }
  const expiresAt = resolved.identity.expiresAt === null ? null : new Date(resolved.identity.expiresAt).getTime();
  const remainingSeconds =
    expiresAt === null ? MAX_COOKIE_AGE_SECONDS : Math.floor((expiresAt - now.getTime()) / 1000);
  const response = createAccessKeyRedirect(
    new URL(resolveAccessKeyDestination(request.nextUrl.searchParams.get('to')), request.url),
  );
  response.headers.append(
    'Set-Cookie',
    renderAccessKeyCookie(plaintext, {
      secure: process.env.NODE_ENV === 'production',
      maxAgeSeconds: Math.min(Math.max(remainingSeconds, 60), MAX_COOKIE_AGE_SECONDS),
    }),
  );
  return response;
}

export const GET = withApiAccess('GET /auth/access-key', handleGET);
