import { type NextRequest, NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { resolveAccessKeyActor } from '@/modules/auth/dashboard-access-keys/resolve-access-key-actor';
import { renderAccessKeyCookie } from '@/modules/auth/dashboard-access-keys/cookie';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

const MAX_COOKIE_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Redeem a dashboard access key into a bearer cookie, then enter the dashboard.
 *
 * @param request - Incoming edge request carrying `?key=inda_...`.
 * @returns 303 to the dashboard on success, or to sign-in without disclosing why.
 */
export function resolveAccessKeyDestination(): string {
  return '/dashboard';
}

async function handleGET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const plaintext = request.nextUrl.searchParams.get('key') ?? '';
  if (plaintext === '') {
    return NextResponse.redirect(new URL('/sign-in?auth=required', request.url), { status: 303 });
  }
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const now = new Date();
  const resolved = await resolveAccessKeyActor(runtime.db, plaintext, requestId, now).catch(() => null);
  if (resolved === null) {
    return NextResponse.redirect(new URL('/sign-in?auth=required', request.url), { status: 303 });
  }
  const expiresAt = resolved.identity.expiresAt === null ? null : new Date(resolved.identity.expiresAt).getTime();
  const remainingSeconds =
    expiresAt === null ? MAX_COOKIE_AGE_SECONDS : Math.floor((expiresAt - now.getTime()) / 1000);
  const response = NextResponse.redirect(new URL(resolveAccessKeyDestination(), request.url), { status: 303 });
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
