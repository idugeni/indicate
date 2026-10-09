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
import { reportChallengeDenial, reportOutcomeStatus } from './route-helpers';

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
      sitekey: await composition.repository.loadReportChallengeSitekey(result.context),
      secrets: context.config.security.turnstileReportSecrets,
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
