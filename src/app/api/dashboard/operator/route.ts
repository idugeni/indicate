import { NextResponse } from 'next/server';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { getSharedRuntimeDatabase } from '@/data/client';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { fetchCachedAnalytics, fetchCachedDashboard } from '@/modules/dashboard/dashboard-dal';
import { authorizeAiOperatorTool, getAiOperatorTool, isAiOperatorToolExecutable, listAiOperatorTools } from '@/modules/ai-operator/tool-registry';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';
import { resolveAiOperatorDashboardContext } from '@/modules/ai-operator/dashboard-context';
import { consumeAiOperatorApproval, getUsableAiOperatorApproval } from '@/modules/ai-operator/approval-store';

const requestSchema = z.object({
  organizationId: z.uuid(),
  toolId: z.string().trim().min(1).max(120),
  input: z.unknown(),
  approvalId: z.uuid().optional(),
}).strict();

/**
 * Execute narrowly allow-listed tenant tools using existing services. Read tools
 * dispatch directly; publication requests require an exact-command persisted
 * approval and reuse the publishing service's idempotency key on retries.
 * Other mutations and platform control-plane operations remain disabled until
 * their transactional execution boundary is implemented.
 */
async function publishingServicesFor() {
  const runtimeContext = await getServerRuntimeContext();
  const config = runtimeContext.config;
  const runtime = getSharedRuntimeDatabase(runtimeContext.bootstrap);
  const repository = new DrizzlePublishingRepository(runtime.db);
  const storage = new R2ObjectStorageAdapter({
    accountId: config.r2.accountId,
    bucketName: config.r2.bucketName,
    publicBucketName: config.r2.publicBucketName,
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  });
  const queue = new UpstashPublicationQueueAdapter({
    url: config.redis.url,
    token: config.redis.token,
    namespace: config.redis.namespace,
    resourceId: config.redis.resourceId,
  });
  return {
    media: new MediaService(repository, storage, new UuidGenerator(), {
      maxBytes: config.r2.maxBytes,
      allowedTypes: config.r2.allowedTypes,
      uploadTtlSeconds: config.r2.uploadTtlSeconds,
      readTtlSeconds: config.r2.readTtlSeconds,
    }),
    publication: new PublicationService(repository, queue, new UuidGenerator(), {
      maxAttempts: config.publishing.maxAttempts,
      delaysSeconds: config.publishing.retryDelaysSeconds,
    }),
  };
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid operator command.', requestId), { status: 400 });
  }

  const { organizationId, toolId, input } = parsedRequest.data;
  const definition = getAiOperatorTool(toolId);
  if (definition === null) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown operator tool.', requestId), { status: 400 });
  }
  if (definition.scope !== 'tenant') {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  const context = await resolveAiOperatorDashboardContext(organizationId, requestId, request.headers);
  if (context === null) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  const authorization = authorizeAiOperatorTool(context.actor, toolId, input);
  if (!authorization.allowed) {
    const status = authorization.reason === 'INVALID_INPUT' ? 400 : authorization.reason === 'UNKNOWN_TOOL' ? 404 : 403;
    return NextResponse.json(createPublicError(
      authorization.reason === 'INVALID_INPUT' ? 'INVALID_INPUT' : 'FORBIDDEN',
      'The operator command is not permitted.',
      requestId,
    ), { status });
  }

  if (authorization.requiresApproval && toolId !== 'publishing.delivery.request' && toolId !== 'content.articles.update' && toolId !== 'content.articles.create') {
    return NextResponse.json(createPublicError('CONFLICT', 'This approval-required tool does not yet have a transactional executor.', requestId), { status: 409 });
  }
  if (!authorization.requiresApproval && parsedRequest.data.approvalId !== undefined) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'An approval ID is only valid for approval-required commands.', requestId), { status: 400 });
  }

  const validated = definition.input.safeParse(input);
  if (!validated.success) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid operator input.', requestId), { status: 400 });
  }

  let result: unknown;
  switch (toolId) {
    case 'publishing.delivery.request': {
      if (context.actor.actorType !== 'user') {
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
      const approvalId = parsedRequest.data.approvalId;
      if (approvalId === undefined) {
        return NextResponse.json(createPublicError('CONFLICT', 'A persisted approval ID is required for this command.', requestId), { status: 409 });
      }
      const command = {
        organizationId,
        actorId: context.actor.actorId,
        toolId,
        input: validated.data,
      };
      const authorizedAt = new Date();
      const usableApproval = await getUsableAiOperatorApproval(context.db, { approvalId, command, now: authorizedAt });
      if (!usableApproval.ok) {
        const status = usableApproval.reason === 'NOT_FOUND' ? 404
          : usableApproval.reason === 'SELF_APPROVAL' ? 403
            : 409;
        return NextResponse.json(createPublicError(
          usableApproval.reason === 'NOT_FOUND' ? 'RESOURCE_UNAVAILABLE' : usableApproval.reason === 'SELF_APPROVAL' ? 'FORBIDDEN' : 'CONFLICT',
          'The approval is missing, expired, or does not authorize this exact command.',
          requestId,
        ), { status });
      }

      const services = await publishingServicesFor();
      const response = await services.publication.request(context.actor, validated.data);
      if (!response.ok) {
        const code = response.error.error.code;
        const status = code === 'FORBIDDEN' ? 403 : code === 'RESOURCE_UNAVAILABLE' ? 404 : code === 'CONFLICT' || code === 'IDEMPOTENCY_CONFLICT' ? 409 : 400;
        return NextResponse.json(response.error, { status });
      }

      const consumed = await consumeAiOperatorApproval(context.db, {
        approvalId,
        command,
        audit: {
          actorType: context.actor.actorType,
          entryPoint: context.actor.entryPoint,
          requestId,
        },
        authorizedAt,
      });
      if (!consumed.ok) {
        // The publication request uses the same idempotency key on retries. Never retry with a new key.
        return NextResponse.json(createPublicError('CONFLICT', 'The publication request was accepted, but its approval receipt could not be finalized. Retry the exact same command and approval ID.', requestId), { status: 409 });
      }
      result = response.value;
      break;
    }
    case 'content.articles.create': {
      if (context.actor.actorType !== 'user') {
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
      const approvalId = parsedRequest.data.approvalId;
      if (approvalId === undefined) {
        return NextResponse.json(createPublicError('CONFLICT', 'A persisted approval ID is required for this command.', requestId), { status: 409 });
      }
      const createInput = validated.data as { regionId: string | null; slug: string; title: string; body: string; excerpt?: string | null; status: 'draft' | 'in_review' };
      const command = { organizationId, actorId: context.actor.actorId, toolId, input: validated.data };
      const authorizedAt = new Date();
      const usableApproval = await getUsableAiOperatorApproval(context.db, { approvalId, command, now: authorizedAt });
      if (!usableApproval.ok) {
        const status = usableApproval.reason === 'NOT_FOUND' ? 404 : usableApproval.reason === 'SELF_APPROVAL' ? 403 : 409;
        return NextResponse.json(createPublicError(
          usableApproval.reason === 'NOT_FOUND' ? 'RESOURCE_UNAVAILABLE' : usableApproval.reason === 'SELF_APPROVAL' ? 'FORBIDDEN' : 'CONFLICT',
          'The approval is missing, expired, or does not authorize this exact command.',
          requestId,
        ), { status });
      }

      // The approval UUID doubles as the article ID. A retry can only find and
      // verify this exact created record; it cannot allocate a second article.
      const currentResponse = await context.service.readArticleForEdit(context.actor, { id: approvalId, ownerOrganizationId: organizationId });
      if (currentResponse.ok) {
        const current = currentResponse.value.article;
        const requestedStateMatches = current.version === 1
          && current.title === createInput.title
          && current.slug === createInput.slug
          && current.body === createInput.body
          && current.regionId === createInput.regionId
          && current.status === createInput.status
          && current.excerpt === (createInput.excerpt ?? null)
          && current.type === 'standard'
          && current.isSponsored === false;
        if (!requestedStateMatches) {
          return NextResponse.json(createPublicError('CONFLICT', 'The deterministic article ID already exists with a different state; no new article was created.', requestId), { status: 409 });
        }
        if (!usableApproval.replay) {
          const consumed = await consumeAiOperatorApproval(context.db, {
            approvalId, command,
            audit: { actorType: context.actor.actorType, entryPoint: context.actor.entryPoint, requestId },
            authorizedAt,
          });
          if (!consumed.ok) return NextResponse.json(createPublicError('CONFLICT', 'The article exists, but its approval receipt could not be finalized. Retry the exact same command.', requestId), { status: 409 });
        }
        result = { articleId: current.id, version: current.version, replayed: true };
        break;
      }
      const readErrorCode = currentResponse.error.error.code;
      if (readErrorCode !== 'FORBIDDEN' && readErrorCode !== 'RESOURCE_UNAVAILABLE') {
        const status = readErrorCode === 'INTERNAL_ERROR' ? 500 : 400;
        return NextResponse.json(currentResponse.error, { status });
      }

      const created = await context.service.createArticleWithId(context.actor, createInput, approvalId);
      if (!created.ok) {
        const code = created.error.error.code;
        const status = code === 'FORBIDDEN' ? 403 : code === 'RESOURCE_UNAVAILABLE' ? 404 : code === 'CONFLICT' ? 409 : code === 'INTERNAL_ERROR' ? 500 : 400;
        return NextResponse.json(created.error, { status });
      }
      const consumed = await consumeAiOperatorApproval(context.db, {
        approvalId, command,
        audit: { actorType: context.actor.actorType, entryPoint: context.actor.entryPoint, requestId },
        authorizedAt,
      });
      if (!consumed.ok) {
        return NextResponse.json(createPublicError('CONFLICT', 'The article was created, but its approval receipt could not be finalized. Retry the exact same command and approval ID.', requestId), { status: 409 });
      }
      result = { article: created.value, replayed: false };
      break;
    }
    case 'content.articles.update': {
      if (context.actor.actorType !== 'user') {
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
      const approvalId = parsedRequest.data.approvalId;
      if (approvalId === undefined) {
        return NextResponse.json(createPublicError('CONFLICT', 'A persisted approval ID is required for this command.', requestId), { status: 409 });
      }
      const updateInput = validated.data as { articleId: string; expectedVersion: number; title?: string; body?: string; status?: 'draft' | 'in_review' | 'scheduled' | 'active' };
      const command = { organizationId, actorId: context.actor.actorId, toolId, input: validated.data };
      const authorizedAt = new Date();
      const usableApproval = await getUsableAiOperatorApproval(context.db, { approvalId, command, now: authorizedAt });
      if (!usableApproval.ok) {
        const status = usableApproval.reason === 'NOT_FOUND' ? 404 : usableApproval.reason === 'SELF_APPROVAL' ? 403 : 409;
        return NextResponse.json(createPublicError(
          usableApproval.reason === 'NOT_FOUND' ? 'RESOURCE_UNAVAILABLE' : usableApproval.reason === 'SELF_APPROVAL' ? 'FORBIDDEN' : 'CONFLICT',
          'The approval is missing, expired, or does not authorize this exact command.',
          requestId,
        ), { status });
      }

      const currentResponse = await context.service.readArticleForEdit(context.actor, { id: updateInput.articleId, ownerOrganizationId: organizationId });
      if (!currentResponse.ok) {
        const status = currentResponse.error.error.code === 'FORBIDDEN' ? 403 : currentResponse.error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : 400;
        return NextResponse.json(currentResponse.error, { status });
      }
      const current = currentResponse.value.article;
      if (current.status === 'archived') {
        return NextResponse.json(createPublicError('CONFLICT', 'Archived articles must be restored before they can be updated.', requestId), { status: 409 });
      }
      const requestedStateMatches = (updateInput.title === undefined || current.title === updateInput.title)
        && (updateInput.body === undefined || current.body === updateInput.body)
        && (updateInput.status === undefined || current.status === updateInput.status);
      const replayedWrite = current.version === updateInput.expectedVersion + 1 && requestedStateMatches;
      if (usableApproval.replay || replayedWrite) {
        if (!requestedStateMatches) {
          return NextResponse.json(createPublicError('CONFLICT', 'The approved update was already consumed but the current article does not match the requested state.', requestId), { status: 409 });
        }
        if (!usableApproval.replay) {
          const consumed = await consumeAiOperatorApproval(context.db, {
            approvalId, command,
            audit: { actorType: context.actor.actorType, entryPoint: context.actor.entryPoint, requestId },
            authorizedAt,
          });
          if (!consumed.ok) return NextResponse.json(createPublicError('CONFLICT', 'The article matches the approved update, but its approval receipt could not be finalized. Retry the exact same command.', requestId), { status: 409 });
        }
        result = { articleId: current.id, version: current.version, replayed: true };
        break;
      }
      if (current.version !== updateInput.expectedVersion) {
        return NextResponse.json(createPublicError('CONFLICT', 'The article changed after the approval request was created. Request a new approval for the latest version.', requestId), { status: 409 });
      }

      const mutation = {
        id: current.id,
        expectedVersion: updateInput.expectedVersion,
        regionId: current.regionId,
        slug: current.slug,
        title: updateInput.title ?? current.title,
        publisherId: current.publisherId ?? null,
        categoryId: current.categoryId ?? null,
        authorId: current.authorId ?? null,
        leadMediaId: current.leadMediaId ?? null,
        coverImageUrl: current.coverImageUrl ?? null,
        excerpt: current.excerpt ?? null,
        canonicalUrl: current.canonicalUrl ?? null,
        body: updateInput.body ?? current.body,
        bodyJson: current.bodyJson ?? null,
        source: current.source ?? '',
        tags: current.tags ?? [],
        status: updateInput.status ?? current.status,
        scheduledAt: current.scheduledAt ?? null,
        type: current.type,
        isSponsored: current.isSponsored,
        videoUrl: current.videoUrl ?? null,
        audioUrl: current.audioUrl ?? null,
        durationSeconds: current.durationSeconds ?? null,
      };
      const updated = await context.service.updateArticle(context.actor, mutation);
      if (!updated.ok) {
        const code = updated.error.error.code;
        const status = code === 'FORBIDDEN' ? 403 : code === 'RESOURCE_UNAVAILABLE' ? 404 : code === 'CONFLICT' ? 409 : 400;
        return NextResponse.json(updated.error, { status });
      }
      const consumed = await consumeAiOperatorApproval(context.db, {
        approvalId, command,
        audit: { actorType: context.actor.actorType, entryPoint: context.actor.entryPoint, requestId },
        authorizedAt,
      });
      if (!consumed.ok) {
        return NextResponse.json(createPublicError('CONFLICT', 'The article update succeeded, but its approval receipt could not be finalized. Retry the exact same command.', requestId), { status: 409 });
      }
      result = { article: updated.value, replayed: false };
      break;
    }
    case 'dashboard.overview.read': {
      if (context.actor.actorType !== 'user') {
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
      const response = await fetchCachedDashboard(context.actor);
      if (!response.ok) return NextResponse.json(response.error, { status: 403 });
      result = response.value;
      break;
    }
    case 'analytics.overview.read': {
      if (context.actor.actorType !== 'user') {
        return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
      }
      const response = await fetchCachedAnalytics(context.actor, {});
      if (!response.ok) return NextResponse.json(response.error, { status: 403 });
      result = response.value;
      break;
    }
    case 'media.assets.read': {
      const services = await publishingServicesFor();
      const response = await services.media.list(context.actor, validated.data);
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : response.error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = response.value;
      break;
    }
    case 'publishing.delivery.read': {
      const services = await publishingServicesFor();
      const response = await services.publication.status(context.actor, validated.data);
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : response.error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : response.error.error.code === 'CONFLICT' ? 409 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = response.value;
      break;
    }
    case 'network.sites.read': {
      const siteInput = validated.data as { query?: string };
      const response = await context.service.listConfiguration(context.actor, {
        ...(siteInput.query === undefined ? {} : { search: siteInput.query }),
      });
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = {
        sites: response.value.sites,
        siteSettings: response.value.siteSettings,
        siteTotal: response.value.siteTotal,
        siteTotalInScope: response.value.siteTotalInScope,
        siteLimit: response.value.siteLimit,
        siteSearch: response.value.siteSearch,
        regionScope: response.value.regionScope,
      };
      break;
    }
    case 'operations.summary.read': {
      const response = await context.service.operations(context.actor);
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = response.value;
      break;
    }
    case 'audit.events.read': {
      const auditInput = validated.data as {
        actorId?: string; action?: string; targetType?: string;
        outcome?: 'succeeded' | 'denied' | 'failed'; from?: string; to?: string;
        limit?: number; cursor?: string;
      };
      const response = await context.service.auditLogs(context.actor, auditInput);
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = {
        auditLogs: response.value.auditLogs,
        auditNextCursor: response.value.auditNextCursor,
      };
      break;
    }
    case 'content.articles.search': {
      const searchInput = validated.data as { query?: string; limit?: number };
      const response = await context.service.listEditorial(context.actor, {
        ...(searchInput.query === undefined ? {} : { search: searchInput.query }),
        limit: String(searchInput.limit ?? 20),
      });
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = response.value;
      break;
    }
    default:
      return NextResponse.json(createPublicError('RESOURCE_UNAVAILABLE', 'This operator tool has not been connected to an executor yet.', requestId), { status: 501 });
  }

  logEvent('info', {
    event: 'ai_operator.tool.executed',
    requestId,
    context: {
      toolId,
      organizationId,
      actorId: context.actor.actorId,
      risk: authorization.risk,
      outcome: 'succeeded',
    },
  });
  return NextResponse.json({ toolId, requestId, result });
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request);
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  const parsedOrganization = z.uuid().safeParse(organizationId);
  if (!parsedOrganization.success) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid organization.', requestId), { status: 400 });
  }

  const context = await resolveAiOperatorDashboardContext(parsedOrganization.data, requestId, request.headers);
  if (context === null) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  return NextResponse.json({
    organizationId: context.actor.organizationId,
    tools: listAiOperatorTools(context.actor, 'tenant')
      .filter((tool) => isAiOperatorToolExecutable(tool.id)),
  });
}

export const GET = withApiAccess('GET /api/dashboard/operator', handleGET);
export const POST = withApiAccess('POST /api/dashboard/operator', handlePOST);
