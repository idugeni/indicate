import { after, type NextRequest, NextResponse } from 'next/server';

import { ensureRequestId } from '@/core/observability/request-id';
import { getVerifiedNeonIdentity } from '@/integrations/neon-auth/identity';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { resolveCallbackDestination } from './route-helpers';

function auditCallbackFailure(requestId: string, flow: string | null, hasSession: boolean): void {
  console.warn(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    service: 'indicate-web',
    event: 'auth.callback.failed',
    requestId,
    flow: flow === 'signup' ? 'signup' : 'other',
    hasVerifiedSession: hasSession,
  }));
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
 * Final first-party landing after Neon Auth finishes email verification or a
 * password-reset flow. Credential and verification tokens are consumed by
 * Neon Auth itself; this handler never exchanges Supabase PKCE/OTP values.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const flow = params.get('flow');
  const next = params.get('next');
  const identity = await getVerifiedNeonIdentity();

  if (identity === null) {
    auditCallbackFailure(ensureRequestId(request.headers).requestId, flow, false);
    return NextResponse.redirect(new URL('/sign-in?auth=unavailable', request.url), { status: 303 });
  }

  if (flow === 'signup' && identity.email !== null) {
    after(() => sendWelcomeEmail({
      authUserId: identity.authUserId,
      email: identity.email as string,
      displayName: identity.displayName,
    }));
  }

  const destination = resolveCallbackDestination(null, next);
  return NextResponse.redirect(new URL(destination, request.url), { status: 303 });
}
