import { cookies } from 'next/headers';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { PUBLISHING_PERMISSIONS } from '@/modules/publishing/permissions';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import {
  DrizzlePublishingRepository,
  MEDIA_SNAPSHOT_COLLECTIONS,
  PUBLISHING_SNAPSHOT_COLLECTIONS,
} from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { logEvent } from '@/core/observability/logger';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import type { PublishingRepository } from '@/modules/publishing/ports';
import type { ObjectStoragePort } from '@/integrations/storage/ports';

const querySchema = z.object({ organizationId: z.uuid(), view: z.enum(['media', 'publishing']), jobId: z.uuid().optional() });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() });
const DISPATCHING_ACTIONS: ReadonlySet<string> = new Set(['publication.request', 'publication.requestBulk', 'publication.retry']);

/**
 * Drain the publication queue once the response has been sent.
 *
 * @param requestId - Request id of the command that enqueued the work.
 * @remarks The queue is a Redis sorted set scored by due time, so the periodic
 * worker is only a sampler: a job due now waits for the next tick. Draining it
 * here removes that wait, and the module is imported dynamically so the read
 * path never pays to load the worker, its Postgres pool, or its R2 client. A
 * failure here is safe — the job stays in the queue and the poller retries it.
 */
function dispatchAfterEnqueue(requestId: string): void {
  after(async () => {
    const workerId = `after-${requestId}`;
    try {
      const { createPublicationWorkerContext } = await import('@/modules/integrations/integrations-composition');
      const composition = await createPublicationWorkerContext();
      if (!(await composition.queue.hasPendingWork())) return;
      await composition.worker().run(workerId);
    } catch (error) {
      logEvent('error', { event: 'publishing.dispatch.deferred', requestId, context: { name: error instanceof Error ? error.name : 'UnknownError' } });
    }
  });
}

interface ServiceContext {
  readonly actor: AuthorizedTenantActorContext;
  readonly repository: PublishingRepository;
  readonly storage: ObjectStoragePort;
  readonly media: MediaService;
  readonly publication: PublicationService;
}
type ContextResult = ServiceContext | PublicErrorEnvelope;
const isError = (value: ContextResult): value is PublicErrorEnvelope => 'error' in value;
/**
 * Maps a publication envelope to its HTTP status.
 *
 * @param error - Envelope produced by `PublicationService` or denial helpers.
 * @returns Status code honoring 409 for idempotency and lease conflicts.
 */
export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'UNAUTHENTICATED' ? 401 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'INVALID_INPUT' ? 400 : ['CONFLICT', 'IDEMPOTENCY_CONFLICT', 'INVALID_STATE_TRANSITION'].includes(error.error.code) ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;

async function contextFor(organizationId: string, requestId: string): Promise<ContextResult> {
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const config = context.config;
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) {
    logEvent('warn', { event: 'publishing.auth.denied', requestId, context: { reason: 'no_session' } });
    return createPublicError('UNAUTHENTICATED', 'Sesi berakhir. Muat ulang lalu masuk kembali.', requestId);
  }
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null) {
    logEvent('warn', { event: 'publishing.auth.denied', requestId, context: { reason: 'no_membership' } });
    return createNonDisclosingDenial(requestId);
  }
  const repository = new DrizzlePublishingRepository(runtime.db);
  const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, publicBucketName: config.r2.publicBucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
  const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
  return { actor, repository, storage, media: new MediaService(repository, storage, new UuidGenerator(), { maxBytes: config.r2.maxBytes, allowedTypes: config.r2.allowedTypes, uploadTtlSeconds: config.r2.uploadTtlSeconds, readTtlSeconds: config.r2.readTtlSeconds }), publication: new PublicationService(repository, queue, new UuidGenerator(), { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds }) };
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request); const url = new URL(request.url);
  const parsed = querySchema.safeParse({ organizationId: url.searchParams.get('organizationId'), view: url.searchParams.get('view'), jobId: url.searchParams.get('jobId') ?? undefined });
  if (!parsed.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return NextResponse.json(context, { status: statusFor(context) });
  {
    if (parsed.data.view === 'media') {
      const snapshot = await context.repository.snapshot(context.actor.organizationId, context.actor.regionScopeId ?? null, MEDIA_SNAPSHOT_COLLECTIONS);
      if (snapshot === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      const listed = await context.media.list(context.actor, {
        limit: url.searchParams.get('limit') ?? undefined,
        cursor: url.searchParams.get('cursor') ?? undefined,
        owner: url.searchParams.get('owner') ?? undefined,
        purpose: url.searchParams.get('purpose') ?? undefined,
        state: url.searchParams.get('state') ?? undefined,
        search: url.searchParams.get('search') ?? undefined,
      });
      if (!listed.ok) return NextResponse.json(listed.error, { status: statusFor(listed.error) });
      const counts = await context.repository.mediaOwnerCounts(context.actor).catch(() => []);
      return NextResponse.json({ media: listed.value.items, nextCursor: listed.value.nextCursor, mediaCounts: counts, articles: snapshot.articles, sites: snapshot.sites });
    }
    if (!context.actor.permissionSet.has(PUBLISHING_PERMISSIONS.publishingRead)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (parsed.data.jobId !== undefined) { const result = await context.publication.status(context.actor, { jobId: parsed.data.jobId }); return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: statusFor(result.error) }); }
    const snapshot = await context.repository.snapshot(context.actor.organizationId, context.actor.regionScopeId ?? null, PUBLISHING_SNAPSHOT_COLLECTIONS);
    if (snapshot === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    return NextResponse.json({ articles: snapshot.articles, domains: snapshot.domains, sites: snapshot.sites, articleSites: snapshot.articleSites });
  }
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid Publishing command.', requestId), { status: 400 });
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return NextResponse.json(context, { status: statusFor(context) });
  {
    const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'media.reserve': (payload) => context.media.reserveUpload(context.actor, payload),
      'media.complete': (payload) => context.media.completeUpload(context.actor, payload),
      'media.archive': (payload) => context.media.archive(context.actor, payload),
      'media.update': (payload) => context.media.updateMetadata(context.actor, payload),
      'media.read': (payload) => context.media.authorizeTenantRead(context.actor, payload),
      'media.readMany': (payload) => context.media.authorizeTenantReadMany(context.actor, payload),
      'media.list': (payload) => context.media.list(context.actor, payload),
      'publication.request': (payload) => context.publication.request(context.actor, payload),
      'publication.requestBulk': (payload) => context.publication.requestBulk(context.actor, payload),
      'publication.suggest': (payload) => context.publication.suggest(context.actor, payload),
      'publication.retry': (payload) => context.publication.retry(context.actor, payload),
      'publication.unpublish': (payload) => context.publication.unpublish(context.actor, payload),
      'publication.setSiteRobots': (payload) => context.publication.setSiteRobots(context.actor, payload),
      'publication.status': (payload) => context.publication.status(context.actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown Publishing command.', requestId), { status: 400 });
    const result = await action(parsed.data.payload);
    if (result.ok && DISPATCHING_ACTIONS.has(parsed.data.action)) dispatchAfterEnqueue(requestId);
    return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: statusFor(result.error) });
  }
}

export const GET = withApiAccess('GET /api/dashboard/publishing', handleGET);
export const POST = withApiAccess('POST /api/dashboard/publishing', handlePOST);
