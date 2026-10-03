import { NextResponse } from 'next/server';

import { withApiAccess } from '@/core/observability/api-access';

async function handleGET(request: Request) {
  return NextResponse.redirect(new URL('/logo.png', request.url), 308);
}

/**
 * Aliaskan path logo lawas ke rute logo kanonis per tenant.
 *
 * @returns Redirect permanen ke `/logo.png` yang me-resolve media per host.
 */
export const GET = withApiAccess('GET /brand/logo.png', handleGET);
