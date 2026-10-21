import { NextResponse } from 'next/server';

import { getServerRuntimeContext, invalidateRuntimeConfigRevision } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { RuntimeConfigInvalidationPostgresRepository } from '@/data/repos/runtime-config/invalidation';
import { deliveryOperationsComposition } from '@/modules/delivery';
import { reconcileRuntimeConfigInvalidationIntents } from '@/modules/persisted-config/invalidation-reconciler';
import { logEvent } from '@/core/observability/logger';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { authorized } from '@/app/api/internal/auth';

type ServerRuntimeContext = Awaited<ReturnType<typeof getServerRuntimeContext>>;

async function reconcileRuntimeConfigIntents(
  context: ServerRuntimeContext,
  now: Date,
  batchSize: number,
) {
  // The database function intentionally claims all due intents on its target
  // database. Restrict this scheduled consumer to the production deployment.
  if (context.bootstrap.environment !== 'production' || process.env.VERCEL_ENV !== 'production') {
    return { skipped: 'non-production' as const, claimed: 0, completed: 0, failed: 0, stranded: 0 };
  }

  try {
    const runtime = getSharedRuntimeDatabase(context.bootstrap);
    const result = await reconcileRuntimeConfigInvalidationIntents({
      repository: new RuntimeConfigInvalidationPostgresRepository(runtime.client),
      invalidate: invalidateRuntimeConfigRevision,
      now,
      batchSize: Math.min(20, Math.max(1, batchSize)),
    });
    logEvent('info', {
      event: 'runtime-config.invalidation.reconcile',
      context: result,
    });
    return result;
  } catch {
    // Keep the existing delivery reconciler observable and independent when the
    // separate configuration-intent queue is unavailable.
    logEvent('warn', {
      event: 'runtime-config.invalidation.reconcile-failed',
      context: { failureCategory: 'runtime_config_invalidation_unavailable' },
    });
    return { skipped: 'unavailable' as const, claimed: 0, completed: 0, failed: 0, stranded: 0 };
  }
}

async function runReconcile(request: Request) {
  const requestId = resolveRequestId(request);
  const context = await getServerRuntimeContext();
  const config = context.config;
  if (!authorized(request, config.security.cronSecret)) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  const scope = new URL(request.url).searchParams.get('scope') ?? 'all';
  if (scope !== 'invalidation' && scope !== 'provisioning' && scope !== 'all') {
    return NextResponse.json({ error: 'INVALID_SCOPE' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const composition = await deliveryOperationsComposition();
  const now = new Date();
  if (scope === 'invalidation') {
    const [invalidation, runtimeConfigInvalidation] = await Promise.all([
      composition.invalidation.dispatch(now, composition.config.publishing.batchSize),
      reconcileRuntimeConfigIntents(context, now, composition.config.publishing.batchSize),
    ]);
    logEvent('info', {
      event: 'delivery.reconcile',
      requestId,
      route: 'GET /api/internal/delivery/reconcile',
      context: { scope, invalidation, runtimeConfigInvalidation },
    });
    return NextResponse.json(
      { invalidation, runtimeConfigInvalidation },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  if (scope === 'provisioning') {
    const activation = await composition.provisioning.reconcile(now);
    logEvent('info', {
      event: 'delivery.reconcile',
      requestId,
      route: 'GET /api/internal/delivery/reconcile',
      context: { scope, activation },
    });
    return NextResponse.json({ activation }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  const [activation, invalidation, runtimeConfigInvalidation] = await Promise.all([
    composition.provisioning.reconcile(now),
    composition.invalidation.dispatch(now, composition.config.publishing.batchSize),
    reconcileRuntimeConfigIntents(context, now, composition.config.publishing.batchSize),
  ]);
  logEvent('info', {
    event: 'delivery.reconcile',
    requestId,
    route: 'GET /api/internal/delivery/reconcile',
    context: { scope, activation, invalidation, runtimeConfigInvalidation },
  });
  return NextResponse.json(
    { activation, invalidation, runtimeConfigInvalidation },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}

async function handleGET(request: Request) {
  return runReconcile(request);
}

/**
 * Run delivery and runtime-config reconciliation.
 *
 * @remarks Cron-only surface: Vercel Cron sends GET with an automatic
 * Authorization Bearer CRON_SECRET header when the CRON_SECRET env is available.
 */
export const GET = withApiAccess('GET /api/internal/delivery/reconcile', handleGET);

export const maxDuration = 180;
