import { NextResponse, type NextRequest } from 'next/server';

import { neonAuth } from '@/integrations/neon-auth/server';
import { verifyTurnstileToken } from '@/core/security/turnstile-verify';
import { TURNSTILE_TOKEN_HEADER } from '@/core/security/turnstile-contract';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handlers = neonAuth.handler();
export const GET = handlers.GET;

/** Gate public email auth mutations with server-side Turnstile Siteverify when configured. */
export async function POST(request: NextRequest) {
  const path = new URL(request.url).pathname;
  const requiresChallenge =
    path.endsWith('/sign-in/email') ||
    path.endsWith('/sign-up/email') ||
    path.endsWith('/request-password-reset');

  if (requiresChallenge && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    const secret = process.env.TURNSTILE_AUTH_SECRET?.trim();
    if (!secret) {
      return NextResponse.json({ message: 'Security verification is not configured.' }, { status: 503 });
    }
    const token = request.headers.get(TURNSTILE_TOKEN_HEADER);
    const remoteIp = request.headers.get('cf-connecting-ip');
    const verdict = await verifyTurnstileToken({ secret, token, remoteIp });
    if (verdict.outcome !== 'verified') {
      const status = verdict.outcome === 'unavailable' ? 503 : 400;
      return NextResponse.json({ message: 'Security verification failed. Refresh the challenge and try again.' }, { status });
    }
  }

  return handlers.POST(request);
}
