import { headers } from 'next/headers';
import { connection, NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { extractPlatformIp } from '@/core/routing/platform-guard';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { deliveryComposition } from '@/modules/delivery';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { EmailNewsletterService, newsletterSubscribeSchema } from '@/modules/integrations/email-newsletter-service';
import { enforceNewsletterThrottle } from '@/modules/integrations/newsletter-throttle';

async function handlePOST(request: Request) {
  await connection();
  const requestId = resolveRequestId(request);
  const noStore = { 'Cache-Control': 'no-store' };
  const composition = await deliveryComposition();
  const requestHeaders = await headers();
  const result = await composition.resolver.classify(requestHeaders.get('host'));
  if (result.kind !== 'site') return new NextResponse(null, { status: 404, headers: noStore });
  const context = await getServerRuntimeContext();
  const production = await createProductionIntegrationsContext();
  try {
    const clientIp = extractPlatformIp(requestHeaders);
    const throttle = await enforceNewsletterThrottle(production.rateLimits, {
      hostname: result.context.normalizedHostname,
      clientIp,
      hostPolicy: context.config.rateLimits.publicRead,
      requestId,
    });
    if (!throttle.allowed) {
      return NextResponse.json(createPublicError('RATE_LIMITED', 'Request limit exceeded. Retry later.', requestId, { retryAfterSeconds: [throttle.retryAfterSeconds] }), { status: 429, headers: { ...noStore, 'Retry-After': throttle.retryAfterSeconds } });
    }
    const parsed = newsletterSubscribeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Please provide a valid email address.', requestId), { status: 400, headers: noStore });
    if (production.email === null) {
      return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Newsletter service is temporarily unavailable.', requestId), { status: 503, headers: noStore });
    }
    const shell = await composition.content.loadShell(result.context);
    if (shell === null) return new NextResponse(null, { status: 404, headers: noStore });
    const service = new EmailNewsletterService(production.email);
    const outcome = await service.subscribe({ email: parsed.data.email, siteId: result.context.siteId, siteName: shell.settings.name });
    if (!outcome.subscribed) {
      return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Newsletter service is temporarily unavailable.', requestId), { status: 503, headers: noStore });
    }
    return NextResponse.json({ ok: true, requestId }, { headers: noStore });
  } catch (error) {
    logEvent('error', {
      event: 'network.newsletter.subscribe_failed',
      requestId,
      route: 'POST /api/network/newsletter',
      method: 'POST',
      status: 503,
      context: { reason: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' },
    });
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Newsletter service is temporarily unavailable.', requestId), { status: 503, headers: noStore });
  }
}

/**
 * Accept per-host public newsletter subscriptions.
 *
 * @remarks Stays dynamic per request because of the per-host tenant classification.
 */
export const POST = withApiAccess('POST /api/network/newsletter', handlePOST);
export async function GET(request: Request) {
  return NextResponse.json(createNonDisclosingDenial(resolveRequestId(request)), { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
