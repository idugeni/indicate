import { after, type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { getPublicConfig } from '@/core/config/public-config';
import { ensureRequestId } from '@/core/observability/request-id';
import { createHardenedSupabaseCookieStore, createSupabaseSsrAuthAdapter } from '@/integrations/supabase/supabase-ssr';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { safeRedirectPath } from '@/core/security/safe-redirect-path';

/** Reserved Supabase param correlating a PKCE callback with its verifier slot. */
const PKCE_FLOW_ID_PARAM = 'sb_flow_id';

function withSupabaseCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createHardenedSupabaseCookieStore({
    getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })),
    set: (name, value, options) => {
      cookieStore.set(name, value, options);
    },
  });
}

interface CallbackFailureAudit {
  readonly requestId: string;
  readonly reason: 'provider_error' | 'exchange_failed';
  readonly providerError: string | null;
  readonly providerErrorCode: string | null;
  readonly hadCode: boolean;
  readonly hadTokenHash: boolean;
}

/**
 * Record why a callback could not establish a session.
 *
 * @param audit - Failure shape; carries no token, code, or identity material.
 * @remarks Recorded here because a `provider_error` never reaches the exchange,
 * so the only other signal is a redirect whose alert reads like an expired link.
 */
function auditCallbackFailure(audit: CallbackFailureAudit): void {
  console.warn(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'warn',
    service: 'indicate-web',
    event: 'auth.callback.failed',
    requestId: audit.requestId,
    reason: audit.reason,
    providerError: audit.providerError ?? '',
    providerErrorCode: audit.providerErrorCode ?? '',
    hadCode: audit.hadCode,
    hadTokenHash: audit.hadTokenHash,
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

/**
 * Choose the sign-in alert for a failed callback.
 *
 * @param providerError - Supabase `error` param, or null when the provider returned none.
 * @returns `provider` when Auth reported an OAuth error, `unavailable` otherwise.
 * @remarks A provider error means the exchange never ran here: mismatched
 * redirect URI or authorized origin in the provider setup fails inside Supabase
 * and is not an expired link, so labelling it `unavailable` sends operators and
 * users after the wrong cause.
 */
export function resolveCallbackFailureAlert(providerError: string | null): 'provider' | 'unavailable' {
  return providerError === null ? 'unavailable' : 'provider';
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get('code') ?? '';
  const tokenHash = params.get('token_hash') ?? '';
  const tokenType = params.get('type');
  const next = params.get('next');
  const providerError = params.get('error');
  const providerErrorCode = params.get('error_code');
  const flowId = params.get(PKCE_FLOW_ID_PARAM);
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
    ? await auth.exchangeCodeForSession(code, flowId)
    : await auth.verifyTokenHash(tokenHash, tokenKind);
  if (!exchanged) {
    auditCallbackFailure({
      requestId: ensureRequestId(request.headers).requestId,
      reason: providerError === null ? 'exchange_failed' : 'provider_error',
      providerError,
      providerErrorCode,
      hadCode: code !== '',
      hadTokenHash: tokenHash !== '',
    });
    const alert = resolveCallbackFailureAlert(providerError);
    return NextResponse.redirect(new URL(`/sign-in?auth=${alert}`, request.url), { status: 303 });
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