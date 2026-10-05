import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createPublicationWorkerComposition } from '@/modules/integrations';
import { createPublicError } from '@/core/errors';
import { logEvent } from '@/core/observability/logger';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import type { WorkerRunSummary } from '@/modules/publishing/publication-worker';

const IDLE_SUMMARY: WorkerRunSummary = Object.freeze({ claimed: 0, processed: 0, reconciled: 0, cleaned: 0, failed: 0 });

const RECONCILE_EVERY_MINUTES = 5;
const RECONCILE_BUDGET_BUFFER_MS = 20_000;

/**
 * Compare a presented Authorization header against the cron secret.
 *
 * @param value - Raw Authorization header value.
 * @param expected - Expected cron secret (without the Bearer prefix).
 * @returns True only on an exact Bearer match (timing-safe).
 */
export function matchesSecret(value: string | null, expected: string): boolean {
  if (value === null || !value.startsWith('Bearer ')) return false;
  const actual = Buffer.from(value.slice('Bearer '.length)); const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

/**
 * Decide whether this per-minute work tick also owes a reconcile pass.
 *
 * @param now - Current time.
 * @returns True every fifth UTC minute, matching the retired reconcile schedule.
 */
export function isReconcileDue(now: Date): boolean {
  return now.getUTCMinutes() % RECONCILE_EVERY_MINUTES === 0;
}

async function handleGET(request: Request) {
  const context = await getServerRuntimeContext(); const config = context.config; const requestId = resolveRequestId(request);
  if (!matchesSecret(request.headers.get('authorization'), config.security.cronSecret)) return NextResponse.json(createPublicError('UNAUTHENTICATED', 'Authentication is required.', requestId), { status: 401 });
  try {
    const mode = new URL(request.url).searchParams.get('mode') ?? 'work';
    if (mode !== 'work' && mode !== 'reconcile') return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown worker mode.', requestId), { status: 400 });
    const composition = createPublicationWorkerComposition(config, context.bootstrap);
    if (mode === 'work' && !(await composition.queue.hasPendingWork()) && !isReconcileDue(new Date())) return NextResponse.json(IDLE_SUMMARY, { status: 200 });
    if (mode === 'reconcile') {
      const summary = await composition.worker().reconcile();
      logEvent('info', { event: 'publishing.run.completed', requestId, context: { runId: `vercel-${requestId}`, mode, ...summary } });
      return NextResponse.json(summary, { status: 200 });
    }
    const started = Date.now();
    const pending = await composition.queue.hasPendingWork();
    const depth = typeof composition.queue.peekDepth === 'function'
      ? await composition.queue.peekDepth().catch(() => null)
      : null;
    logEvent('info', { event: 'publishing.run.started', requestId, context: { runId: `vercel-${requestId}`, mode, pending, ...(depth === null ? {} : { due: depth.due, leased: depth.leased }) } });
    const work = pending ? await composition.worker().run(`vercel-${requestId}`) : IDLE_SUMMARY;
    const reconcileBudgetMs = config.publishing.functionDeadlineSeconds * 1_000 - RECONCILE_BUDGET_BUFFER_MS;
    const reconcile = isReconcileDue(new Date()) && Date.now() - started < reconcileBudgetMs
      ? await composition.worker().reconcile()
      : IDLE_SUMMARY;
    const summary = {
      claimed: work.claimed,
      processed: work.processed,
      reconciled: reconcile.reconciled,
      cleaned: reconcile.cleaned,
      failed: work.failed + reconcile.failed,
    } satisfies WorkerRunSummary;
    logEvent('info', { event: 'publishing.run.completed', requestId, context: { runId: `vercel-${requestId}`, mode, ...summary } });
    return NextResponse.json(summary, { status: 200 });
  } catch {
    logEvent('error', { event: 'publishing.run.failed', requestId, context: { runId: `vercel-${requestId}` } });
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Background processing is temporarily unavailable.', requestId), { status: 503 });
  }
}

export const GET = withApiAccess('GET /api/internal/publishing', handleGET);

export const maxDuration = 120;
