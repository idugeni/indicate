import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { PublicationWorker } from '@/modules/publishing/publication-worker';
import { HttpSharePrewarm } from '@/modules/publishing/share-prewarm';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzlePublicationTargetPublisher } from '@/data/repos/publishing/publication-target-publisher';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { createPublicError } from '@/core/errors';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';

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
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  try {
    const repository = new DrizzlePublishingRepository(runtime.db);
    const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
    const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, publicBucketName: config.r2.publicBucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
    const worker = new PublicationWorker(repository, queue, new DrizzlePublicationTargetPublisher(runtime.db), storage, { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds, leaseSeconds: config.publishing.leaseSeconds, batchSize: config.publishing.batchSize, functionDeadlineSeconds: config.publishing.functionDeadlineSeconds }, undefined, undefined, new HttpSharePrewarm());
    const mode = new URL(request.url).searchParams.get('mode') ?? 'work';
    if (mode !== 'work' && mode !== 'reconcile') return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown worker mode.', requestId), { status: 400 });
    const summary = mode === 'work' ? await worker.run(`vercel-${requestId}`) : await worker.reconcile();
    return NextResponse.json(summary, { status: 200 });
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Background processing is temporarily unavailable.', requestId), { status: 503 });
  }
}

export const GET = withApiAccess('GET /api/internal/publishing', handleGET);

export const maxDuration = 120;
