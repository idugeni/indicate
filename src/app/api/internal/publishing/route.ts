import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createPublicationWorkerComposition } from '@/modules/integrations';
import { createPublicError } from '@/core/errors';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import type { WorkerRunSummary } from '@/modules/publishing/publication-worker';

const IDLE_SUMMARY: WorkerRunSummary = Object.freeze({ claimed: 0, processed: 0, reconciled: 0, cleaned: 0, failed: 0 });

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

async function handleGET(request: Request) {
  const context = await getServerRuntimeContext(); const config = context.config; const requestId = resolveRequestId(request);
  if (!matchesSecret(request.headers.get('authorization'), config.security.cronSecret)) return NextResponse.json(createPublicError('UNAUTHENTICATED', 'Authentication is required.', requestId), { status: 401 });
  try {
    const mode = new URL(request.url).searchParams.get('mode') ?? 'work';
    if (mode !== 'work' && mode !== 'reconcile') return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown worker mode.', requestId), { status: 400 });
    const composition = createPublicationWorkerComposition(config, context.bootstrap);
    if (mode === 'work' && !(await composition.queue.hasPendingWork())) return NextResponse.json(IDLE_SUMMARY, { status: 200 });
    const summary = mode === 'work' ? await composition.worker().run(`vercel-${requestId}`) : await composition.worker().reconcile();
    return NextResponse.json(summary, { status: 200 });
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Background processing is temporarily unavailable.', requestId), { status: 503 });
  }
}

export const GET = withApiAccess('GET /api/internal/publishing', handleGET);

export const maxDuration = 120;
