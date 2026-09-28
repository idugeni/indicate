import { headers } from 'next/headers';
import { connection, NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleModerationRepository } from '@/data/repos/moderation';
import { deliveryComposition } from '@/modules/delivery';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { reportIntakeSchema } from '@/modules/moderation/schemas';
import { enforceReportIntakeThrottle } from '@/modules/moderation/report-intake-throttle';
import { enforceReportIntakeChallenge } from '@/modules/moderation/report-intake-challenge';
import { ModerationService } from '@/modules/moderation/moderation-service';
import { extractPlatformIp } from '@/core/routing/platform-guard';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';

/**
 * Map a report outcome code to its HTTP status.
 *
 * @param code - Error code from the moderation report outcome.
 * @returns 400 for invalid input, 503 for an intake outage, 404 otherwise.
 * @remarks A dependency outage must not be reported as "unknown article": it
 * tells a complainant their report is addressed when it was never stored, and
 * it hides a broken channel from whoever would otherwise notice. The remaining
 * codes stay 404 so tenant content is never disclosed.
 */
export function reportOutcomeStatus(code: string): number {
  if (code === 'INVALID_INPUT') return 400;
  if (code === 'DEPENDENCY_UNAVAILABLE') return 503;
  return 404;
}

/**
 * Map a challenge denial to its public error and status.
 *
 * @param denial.outcome - Whether Cloudflare refused the token or could not be reached.
 * @returns Public error envelope plus status: 403 for a refused token, 503 for a verification outage.
 * @remarks Keeping a Cloudflare-side fault off the 403 path matters: a reader told their submission
 * was refused for bot reasons during an outage stops reporting, and the broken channel stays invisible
 * behind what looks like ordinary bot traffic.
 */
export function reportChallengeDenial(outcome: 'rejected' | 'unavailable', requestId: string): { readonly error: PublicErrorEnvelope; readonly status: number } {
  if (outcome === 'rejected') {
    return { error: createPublicError('FORBIDDEN', 'Security verification failed. Please try again.', requestId), status: 403 };
  }
  return { error: createPublicError('DEPENDENCY_UNAVAILABLE', 'Report intake is temporarily unavailable.', requestId), status: 503 };
}

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
    const throttle = await enforceReportIntakeThrottle(production.rateLimits, {
      hostname: result.context.normalizedHostname,
      clientIp,
      hostPolicy: context.config.rateLimits.publicRead,
      requestId,
    });
    if (!throttle.allowed) {
      return NextResponse.json(createPublicError('RATE_LIMITED', 'Request limit exceeded. Retry later.', requestId, { retryAfterSeconds: [throttle.retryAfterSeconds] }), { status: 429, headers: { ...noStore, 'Retry-After': throttle.retryAfterSeconds } });
    }
    const challenge = await enforceReportIntakeChallenge({
      secret: context.config.security.turnstileSecretKey,
      headers: requestHeaders,
      clientIp,
    });
    if (!challenge.allowed) {
      const denial = reportChallengeDenial(challenge.denial.outcome, requestId);
      logEvent('warn', {
        event: 'network.report.challenge_rejected',
        requestId,
        route: 'POST /api/network/reports',
        method: 'POST',
        status: denial.status,
        context: { outcome: challenge.denial.outcome, hostname: result.context.normalizedHostname },
      });
      return NextResponse.json(denial.error, { status: denial.status, headers: noStore });
    }
    const parsed = reportIntakeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Please correct the report fields.', requestId), { status: 400, headers: noStore });
    let articleId: string | null = null;
    if (parsed.data.articleSlug !== null) {
      articleId = await composition.content.resolveArticleId(result.context, parsed.data.articleSlug);
    }
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const service = new ModerationService(new DrizzleModerationRepository(runtime.db));
    const outcome = await service.submitReport({
      orgId: result.context.organizationId, siteId: result.context.siteId, articleId,
      contact: parsed.data.contact, category: parsed.data.category,
      details: parsed.data.details, articleUrl: parsed.data.articleUrl,
    }, requestId);
    if (!outcome.ok) {
      const code = outcome.error.error.code;
      return NextResponse.json(outcome.error, { status: reportOutcomeStatus(code), headers: noStore });
    }
    return NextResponse.json({ ok: true, requestId }, { headers: noStore });
  } catch (error) {
    logEvent('error', {
      event: 'network.report.intake_failed',
      requestId,
      route: 'POST /api/network/reports',
      method: 'POST',
      status: 503,
      context: { reason: error instanceof Error ? `${error.name}: ${error.message}` : 'unknown' },
    });
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Report intake is temporarily unavailable.', requestId), { status: 503, headers: noStore });
  }
}

/**
 * Accept per-host public content reports.
 *
 * @remarks Stays dynamic per request because of the per-host public report intake.
 */
export const POST = withApiAccess('POST /api/network/reports', handlePOST);
export async function GET(request: Request) {
  return NextResponse.json(createNonDisclosingDenial(resolveRequestId(request)), { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
