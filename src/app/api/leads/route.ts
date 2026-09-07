import { createHash } from 'node:crypto';
import { connection, NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createRuntimeDatabase } from '@/data/client';
import { DrizzleBillingRepository } from '@/data/repos/billing';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { BillingService } from '@/modules/billing/billing-service';
import { createProductionIntegrationsContext } from '@/modules/integrations';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { extractClientIp } from '@/core/routing/platform-guard';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';

async function handlePOST(request: Request) {
  // Intake lead enterprise publik: tanpa sesi, dibatasi laju per IP + consent wajib.
  await connection();
  const requestId = resolveRequestId(request);
  const noStore = { 'Cache-Control': 'no-store' };
  const context = await getServerRuntimeContext();
  const production = await createProductionIntegrationsContext();
  try {
    const clientIp = extractClientIp(request.headers) ?? 'unknown';
    const limited = await production.rateLimits.enforce(
      production.rateLimits.publicKey('enterprise-lead', clientIp),
      { ...context.config.rateLimits.publicRead, failureMode: 'closed' },
      requestId,
    );
    if (!limited.ok) {
      return NextResponse.json(limited.error, { status: 429, headers: { ...noStore, 'Retry-After': limited.error.error.fields?.retryAfterSeconds?.[0] ?? '60' } });
    }
    const ipHash = createHash('sha256').update(clientIp).digest('hex');
    const runtime = createRuntimeDatabase(context.bootstrap);
    try {
      const config = context.config;
      const service = new BillingService(
        new DrizzleBillingRepository(runtime.db), new UuidGenerator(),
        new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey }),
        { allowedTypes: [], maxBytes: 0, uploadTtlSeconds: 0, readTtlSeconds: 0 },
      );
      const outcome = await service.submitLead(await request.json().catch(() => null), requestId, ipHash);
      if (!outcome.ok) {
        const code = outcome.error.error.code;
        return NextResponse.json(outcome.error, { status: code === 'INVALID_INPUT' ? 400 : 503, headers: noStore });
      }
      return NextResponse.json({ ok: true, requestId }, { headers: noStore });
    } finally {
      await runtime.close();
    }
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Lead intake is temporarily unavailable.', requestId), { status: 503, headers: noStore });
  } finally {
    await production.close();
  }
}

export const POST = withApiAccess('POST /api/leads', handlePOST);
export async function GET(request: Request) {
  return NextResponse.json(createNonDisclosingDenial(resolveRequestId(request)), { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
