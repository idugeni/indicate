import { headers } from 'next/headers';
import { connection, NextResponse } from 'next/server';
import { z } from 'zod';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleModerationRepository } from '@/data/repos/moderation';
import { deliveryComposition } from '@/modules/delivery';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { ModerationService } from '@/modules/moderation/moderation-service';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

const bodySchema = z.object({
  articleSlug: z.string().trim().min(1).max(200).nullable().default(null),
  contact: z.string().trim().min(3).max(320),
  category: z.enum(['copyright', 'defamation', 'privacy', 'hate', 'misinformation', 'other']),
  details: z.string().trim().min(10).max(4000),
  articleUrl: z.string().trim().min(8).max(2000).nullable().default(null),
}).strict();

/**
 * Map a report outcome code to its HTTP status.
 *
 * @param code - Error code from the moderation report outcome.
 * @returns 400 for invalid input, 404 otherwise.
 */
export function reportOutcomeStatus(code: string): number {
  return code === 'INVALID_INPUT' ? 400 : 404;
}

async function handlePOST(request: Request) {
  await connection();
  const requestId = resolveRequestId(request);
  const noStore = { 'Cache-Control': 'no-store' };
  const composition = await deliveryComposition();
  const result = await composition.resolver.classify((await headers()).get('host'));
  if (result.kind !== 'site') return new NextResponse(null, { status: 404, headers: noStore });
  const context = await getServerRuntimeContext();
  const production = await createProductionIntegrationsContext();
  try {
    const limited = await production.rateLimits.enforce(
      production.rateLimits.publicKey('content-report', result.context.normalizedHostname),
      { ...context.config.rateLimits.publicRead, failureMode: 'closed' },
      requestId,
    );
    if (!limited.ok) {
      return NextResponse.json(limited.error, { status: 429, headers: { ...noStore, 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '60' } });
    }
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
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
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Report intake is temporarily unavailable.', requestId), { status: 503, headers: noStore });
  }
}

/**
 * Terima laporan konten publik per host.
 *
 * @remarks Tetap dinamis per request karena intake laporan publik per-host.
 */
export const POST = withApiAccess('POST /api/network/reports', handlePOST);
export async function GET(request: Request) {
  return NextResponse.json(createNonDisclosingDenial(resolveRequestId(request)), { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
