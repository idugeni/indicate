import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { getPublicConfig } from '@/core/config/public-config';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { PUBLISHING_PERMISSIONS } from '@/modules/publishing/permissions';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';
import type { PublishingRepository } from '@/modules/publishing/ports';
import type { ObjectStoragePort } from '@/integrations/storage/ports';

const querySchema = z.object({ organizationId: z.uuid(), view: z.enum(['media', 'publishing']), jobId: z.uuid().optional() });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() });

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
export const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : ['CONFLICT', 'IDEMPOTENCY_CONFLICT', 'INVALID_STATE_TRANSITION'].includes(error.error.code) ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;

async function contextFor(organizationId: string, requestId: string): Promise<ContextResult> {
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey, cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }) });
  const identity = await auth.verifyCookieSession(); if (identity === null) return createNonDisclosingDenial(requestId);
  const context = await getServerRuntimeContext(); const config = context.config; const runtime = getSharedRuntimeDatabase(context.bootstrap); const authorization = new DrizzleAuthorizationRepository(runtime.db);
  const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator()); if (!local.ok) { return createNonDisclosingDenial(requestId); }
  const membership = await authorization.findActiveMembership(organizationId, local.value.id); if (membership === null || !membership.roleActive) { return createNonDisclosingDenial(requestId); }
  const actor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(membership.orgPermissions), platformPermissionSet: new Set(membership.platformPermissions), regionScopeId: membership.regionId ?? null, entryPoint: 'dashboard', requestId };
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
    const snapshot = await context.repository.snapshot(context.actor.organizationId, context.actor.regionScopeId ?? null);
    if (snapshot === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (parsed.data.view === 'media') {
      const listed = await context.media.list(context.actor); if (!listed.ok) return NextResponse.json(listed.error, { status: statusFor(listed.error) });
      return NextResponse.json({ media: listed.value, reservations: snapshot.reservations, cleanupTasks: snapshot.cleanupTasks, articles: snapshot.articles, sites: snapshot.sites, invalidationIntents: snapshot.invalidationIntents });
    }
    if (!context.actor.permissionSet.has(PUBLISHING_PERMISSIONS.publishingRead)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (parsed.data.jobId !== undefined) { const result = await context.publication.status(context.actor, { jobId: parsed.data.jobId }); return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: statusFor(result.error) }); }
    return NextResponse.json({ jobs: snapshot.jobs, targets: snapshot.targets, articles: snapshot.articles, sites: snapshot.sites });
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
      'media.read': (payload) => context.media.authorizeTenantRead(context.actor, payload),
      'publication.request': (payload) => context.publication.request(context.actor, payload),
      'publication.requestBulk': (payload) => context.publication.requestBulk(context.actor, payload),
      'publication.suggest': (payload) => context.publication.suggest(context.actor, payload),
      'publication.retry': (payload) => context.publication.retry(context.actor, payload),
      'publication.unpublish': (payload) => context.publication.unpublish(context.actor, payload),
      'publication.status': (payload) => context.publication.status(context.actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown Publishing command.', requestId), { status: 400 });
    const result = await action(parsed.data.payload); return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: statusFor(result.error) });
  }
}

export const GET = withApiAccess('GET /api/dashboard/publishing', handleGET);
export const POST = withApiAccess('POST /api/dashboard/publishing', handlePOST);
