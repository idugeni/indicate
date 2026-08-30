import { timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { PublicationWorker } from '@/application/stage4/publication-worker';
import { getRuntimeConfig } from '@/config/server';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzlePublicationTargetPublisher } from '@/infrastructure/db/drizzle-publication-target-publisher';
import { DrizzleStage4Repository } from '@/infrastructure/db/repositories/drizzle-stage4-repository';
import { UpstashPublicationQueueAdapter } from '@/infrastructure/redis/upstash-publication-queue';
import { R2ObjectStorageAdapter } from '@/infrastructure/storage/r2-object-storage';
import { createPublicError } from '@/shared/errors/application-error';

function matchesSecret(value: string | null, expected: string): boolean {
  if (value === null || !value.startsWith('Bearer ')) return false;
  const actual = Buffer.from(value.slice('Bearer '.length)); const target = Buffer.from(expected);
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export async function GET(request: Request) {
  const config = getRuntimeConfig(); const requestId = crypto.randomUUID();
  if (!matchesSecret(request.headers.get('authorization'), config.security.cronSecret)) return NextResponse.json(createPublicError('UNAUTHENTICATED', 'Authentication is required.', requestId), { status: 401 });
  const runtime = createRuntimeDatabase(config);
  try {
    const repository = new DrizzleStage4Repository(runtime.db);
    const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
    const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
    const worker = new PublicationWorker(repository, queue, new DrizzlePublicationTargetPublisher(runtime.db), storage, { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds, leaseSeconds: config.publishing.leaseSeconds, batchSize: config.publishing.batchSize, functionDeadlineSeconds: config.publishing.functionDeadlineSeconds });
    const mode = new URL(request.url).searchParams.get('mode') ?? 'work';
    if (mode !== 'work' && mode !== 'reconcile') return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown worker mode.', requestId), { status: 400 });
    const summary = mode === 'work' ? await worker.run(`vercel-${requestId}`) : await worker.reconcile();
    return NextResponse.json(summary, { status: 200 });
  } catch {
    return NextResponse.json(createPublicError('DEPENDENCY_UNAVAILABLE', 'Background processing is temporarily unavailable.', requestId), { status: 503 });
  } finally { await runtime.close(); }
}
