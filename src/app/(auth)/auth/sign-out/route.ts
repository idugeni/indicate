import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { neonAuth } from '@/integrations/neon-auth/server';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { createNonDisclosingDenial } from '@/core/errors';
import { renderClearedAccessKeyCookie } from '@/modules/auth/dashboard-access-keys/cookie';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { resolveSignOutDestination } from './route-helpers';

async function handlePOST(request: NextRequest) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  const cookieStore = await cookies();
  await neonAuth.signOut();
  try {
    cookieStore.delete('indicate-access-key');
  } catch {
    /* Header fallback still clears the independently signed access-key cookie. */
  }

  const destination = resolveSignOutDestination(request.nextUrl.searchParams.get('next'));
  const response = NextResponse.redirect(new URL(destination, request.url), { status: 303 });
  response.headers.append('Set-Cookie', renderClearedAccessKeyCookie());
  return response;
}

export const POST = withApiAccess('POST /auth/sign-out', handlePOST);
