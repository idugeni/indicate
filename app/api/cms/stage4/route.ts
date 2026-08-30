import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/application/auth/resolve-authenticated-user';
import { MediaService } from '@/application/stage4/media-service';
import { PublicationService } from '@/application/stage4/publication-service';
import { PublicationWorker } from '@/application/stage4/publication-worker';
import { getPublicConfig } from '@/config/public';
import { getRuntimeConfig } from '@/config/server';
import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import { STAGE4_PERMISSIONS } from '@/domain/stage4/permissions';
import { createSupabaseSsrAuthAdapter } from '@/infrastructure/auth/supabase-ssr';
import { createRuntimeDatabase } from '@/infrastructure/db/client';
import { DrizzleAuthorizationRepository } from '@/infrastructure/db/repositories/drizzle-authorization-repository';
import { DrizzleStage4Repository } from '@/infrastructure/db/repositories/drizzle-stage4-repository';
import { R2ObjectStorageAdapter } from '@/infrastructure/storage/r2-object-storage';
import { UpstashPublicationQueueAdapter } from '@/infrastructure/redis/upstash-publication-queue';
import { InMemoryObjectStorage } from '@/infrastructure/testing/stage4-providers';
import { createStage4Actor, getStage4E2eFixture } from '@/infrastructure/testing/stage4-fixture';
import { ALPHA_ORGANIZATION_ID, BETA_ORGANIZATION_ID } from '@/infrastructure/testing/stage3-fixture';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';
import type { Stage4Repository } from '@/ports/stage4-repository';
import type { ObjectStoragePort } from '@/ports/object-storage';

const querySchema = z.object({ organizationId: z.uuid(), view: z.enum(['media', 'publishing']), jobId: z.uuid().optional() });
const commandSchema = z.object({ organizationId: z.uuid(), action: z.string().min(1).max(100), payload: z.unknown() });
const e2eOrganizations = new Set([ALPHA_ORGANIZATION_ID, BETA_ORGANIZATION_ID]);
const e2eRetryPolicy = { maxAttempts: 5, delaysSeconds: [1, 2, 4, 8] };
const e2eWorkerPolicy = { ...e2eRetryPolicy, leaseSeconds: 30, batchSize: 10, functionDeadlineSeconds: 50 };
const isE2eMode = () => process.env.APP_ENVIRONMENT === 'test' && process.env.STAGE2_E2E_MODE === '1';

interface ServiceContext {
  readonly actor: AuthorizedTenantActorContext;
  readonly repository: Stage4Repository;
  readonly storage: ObjectStoragePort;
  readonly media: MediaService;
  readonly publication: PublicationService;
  close(): Promise<void>;
}
type ContextResult = ServiceContext | PublicErrorEnvelope;
const isError = (value: ContextResult): value is PublicErrorEnvelope => 'error' in value;
const statusFor = (error: PublicErrorEnvelope) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : error.error.code === 'INVALID_INPUT' ? 400 : ['CONFLICT', 'IDEMPOTENCY_CONFLICT', 'INVALID_STATE_TRANSITION'].includes(error.error.code) ? 409 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;

async function contextFor(organizationId: string, requestId: string): Promise<ContextResult> {
  const cookieStore = await cookies();
  if (isE2eMode()) {
    if (cookieStore.get('indicate-stage2-session')?.value !== 'stage2-valid' || !e2eOrganizations.has(organizationId)) return createNonDisclosingDenial(requestId);
    const fixture = getStage4E2eFixture(); const actor = createStage4Actor(organizationId, requestId); const identifiers = new UuidGenerator();
    return {
      actor, repository: fixture.repository, storage: fixture.storage,
      media: new MediaService(fixture.repository, fixture.storage, identifiers, { maxBytes: 10_485_760, allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], uploadTtlSeconds: 600, readTtlSeconds: 300 }),
      publication: new PublicationService(fixture.repository, fixture.queue, identifiers, e2eRetryPolicy), close: async () => undefined,
    };
  }
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, anonKey: publicConfig.supabaseAnonKey, cookies: { getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), setAll: (values) => { for (const { name, value, options } of values) cookieStore.set(name, value, options); } } });
  const identity = await auth.verifyCookieSession(); if (identity === null) return createNonDisclosingDenial(requestId);
  const config = getRuntimeConfig(); const runtime = createRuntimeDatabase(config); const authorization = new DrizzleAuthorizationRepository(runtime.db);
  const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator()); if (!local.ok) { await runtime.close(); return createNonDisclosingDenial(requestId); }
  const membership = await authorization.findActiveMembership(organizationId, local.value.id); if (membership === null || !membership.roleActive) { await runtime.close(); return createNonDisclosingDenial(requestId); }
  const actor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(membership.permissions), entryPoint: 'cms', requestId };
  const repository = new DrizzleStage4Repository(runtime.db);
  const storage = new R2ObjectStorageAdapter({ accountId: config.r2.accountId, bucketName: config.r2.bucketName, accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey });
  const queue = new UpstashPublicationQueueAdapter({ url: config.redis.url, token: config.redis.token, namespace: config.redis.namespace, resourceId: config.redis.resourceId });
  return { actor, repository, storage, media: new MediaService(repository, storage, new UuidGenerator(), { maxBytes: config.r2.maxBytes, allowedTypes: config.r2.allowedTypes, uploadTtlSeconds: config.r2.uploadTtlSeconds, readTtlSeconds: config.r2.readTtlSeconds }), publication: new PublicationService(repository, queue, new UuidGenerator(), { maxAttempts: config.publishing.maxAttempts, delaysSeconds: config.publishing.retryDelaysSeconds }), close: runtime.close };
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID(); const url = new URL(request.url);
  const parsed = querySchema.safeParse({ organizationId: url.searchParams.get('organizationId'), view: url.searchParams.get('view'), jobId: url.searchParams.get('jobId') ?? undefined });
  if (!parsed.success) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return NextResponse.json(context, { status: statusFor(context) });
  try {
    const snapshot = await context.repository.snapshot(context.actor.organizationId);
    if (snapshot === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (parsed.data.view === 'media') {
      const listed = await context.media.list(context.actor); if (!listed.ok) return NextResponse.json(listed.error, { status: statusFor(listed.error) });
      return NextResponse.json({ media: listed.value, reservations: snapshot.reservations, cleanupTasks: snapshot.cleanupTasks, articles: snapshot.articles, sites: snapshot.sites, invalidationIntents: snapshot.invalidationIntents });
    }
    if (!context.actor.permissionSet.has(STAGE4_PERMISSIONS.publishingRead)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    if (parsed.data.jobId !== undefined) { const result = await context.publication.status(context.actor, { jobId: parsed.data.jobId }); return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: statusFor(result.error) }); }
    return NextResponse.json({ jobs: snapshot.jobs, targets: snapshot.targets, articles: snapshot.articles, sites: snapshot.sites });
  } finally { await context.close(); }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID(); const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid Stage 4 command.', requestId), { status: 400 });
  const context = await contextFor(parsed.data.organizationId, requestId); if (isError(context)) return NextResponse.json(context, { status: statusFor(context) });
  try {
    const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'media.reserve': (payload) => context.media.reserveUpload(context.actor, payload),
      'media.complete': (payload) => context.media.completeUpload(context.actor, payload),
      'media.archive': (payload) => context.media.archive(context.actor, payload),
      'media.read': (payload) => context.media.authorizeTenantRead(context.actor, payload),
      'publication.request': (payload) => context.publication.request(context.actor, payload),
      'publication.status': (payload) => context.publication.status(context.actor, payload),
    };
    if (parsed.data.action === 'publication.test.set-outcomes' && isE2eMode()) {
      const value = z.object({ siteId: z.uuid(), outcomes: z.array(z.discriminatedUnion('kind', [z.object({ kind: z.literal('published'), url: z.url() }), z.object({ kind: z.literal('retryable_failure'), code: z.string() }), z.object({ kind: z.literal('terminal_failure'), code: z.string() })])) }).safeParse(parsed.data.payload);
      if (!value.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid test outcomes.', requestId), { status: 400 });
      getStage4E2eFixture().publisher.setOutcomes(value.data.siteId, value.data.outcomes); return NextResponse.json({ configured: true });
    }
    if (parsed.data.action === 'publication.test.run' && isE2eMode()) {
      const fixture = getStage4E2eFixture(); const worker = new PublicationWorker(fixture.repository, fixture.queue, fixture.publisher, fixture.storage, e2eWorkerPolicy);
      return NextResponse.json(await worker.run(`e2e-${requestId}`));
    }
    if (parsed.data.action === 'publication.test.reconcile' && isE2eMode()) {
      const fixture = getStage4E2eFixture(); const worker = new PublicationWorker(fixture.repository, fixture.queue, fixture.publisher, fixture.storage, e2eWorkerPolicy);
      return NextResponse.json(await worker.reconcile());
    }
    if (parsed.data.action === 'media.test.accept-upload' && isE2eMode() && context.storage instanceof InMemoryObjectStorage) {
      const reservationId = z.object({ reservationId: z.uuid() }).safeParse(parsed.data.payload); if (!reservationId.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid test upload.', requestId), { status: 400 });
      const reservation = await context.repository.readReservation(context.actor, reservationId.data.reservationId); if (reservation === null) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      context.storage.putObject({ key: reservation.objectKey, contentType: reservation.expectedMediaType, contentLength: reservation.expectedSizeBytes, checksum: reservation.expectedChecksum });
      return NextResponse.json({ accepted: true });
    }
    const action = actions[parsed.data.action]; if (action === undefined) return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown Stage 4 command.', requestId), { status: 400 });
    const result = await action(parsed.data.payload); return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: statusFor(result.error) });
  } finally { await context.close(); }
}
