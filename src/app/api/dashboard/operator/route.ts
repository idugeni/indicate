import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { logEvent } from '@/core/observability/logger';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { isPlatformOnlyWithoutTicket } from '@/core/routing/platform-guard';
import { fetchCachedAnalytics, fetchCachedDashboard, NextDashboardCacheInvalidator } from '@/modules/dashboard/dashboard-dal';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { authorizeAiOperatorTool, getAiOperatorTool, listAiOperatorTools } from '@/modules/ai-operator/tool-registry';
import { MediaService } from '@/modules/publishing/media-service';
import { PublicationService } from '@/modules/publishing/publication-service';
import { DrizzlePublishingRepository } from '@/data/repos/publishing/repository';
import { R2ObjectStorageAdapter } from '@/integrations/storage/r2-object-storage';
import { UpstashPublicationQueueAdapter } from '@/integrations/redis/upstash-publication-queue';

const requestSchema = z.object({
  organizationId: z.uuid(),
  toolId: z.string().trim().min(1).max(120),
  input: z.unknown(),
}).strict();

type OperatorContext = {
  readonly actor: AuthorizedTenantActorContext;
  readonly service: TenantBusinessService;
};

async function resolveContext(organizationId: string, requestId: string, headers: Headers): Promise<OperatorContext | null> {
  const cookieStore = await cookies();
  const runtimeContext = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(runtimeContext.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return null;

  if (user.accessKey !== null) {
    const actor = user.accessKey.actor;
    if (actor.organizationId !== organizationId) return null;
    if (isPlatformOnlyWithoutTicket({
      orgPermissionCount: actor.permissionSet.size,
      platformPermissionCount: actor.platformPermissionSet?.size ?? 0,
      headers,
    })) return null;
    return {
      actor,
      service: new TenantBusinessService(
        new DrizzleDashboardRepository(runtime.db),
        new UuidGenerator(),
        undefined,
        undefined,
        new NextDashboardCacheInvalidator(),
      ),
    };
  }

  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null || isPlatformOnlyWithoutTicket({
    orgPermissionCount: actor.permissionSet.size,
    platformPermissionCount: actor.platformPermissionSet?.size ?? 0,
    headers,
  })) return null;

  return {
    actor,
    service: new TenantBusinessService(
      new DrizzleDashboardRepository(runtime.db),
      new UuidGenerator(),
      undefined,
      undefined,
      new NextDashboardCacheInvalidator(),
    ),
  };
}

/**
 * Execute a narrowly allow-listed set of read-only tools using existing dashboard
 * services. This route intentionally does not implement mutations or platform
 * control-plane operations; those require persisted approvals and their own
 * service-level authorization before they can be exposed.
 */
async function publishingServicesFor(actor: AuthorizedTenantActorContext) {
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

  const context = await resolveContext(organizationId, requestId, request.headers);
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

  if (authorization.requiresApproval) {
    return NextResponse.json(createPublicError('CONFLICT', 'This action requires a persisted approval workflow and is not executable yet.', requestId), { status: 409 });
  }

  const validated = definition.input.safeParse(input);
  if (!validated.success) {
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid operator input.', requestId), { status: 400 });
  }

  let result: unknown;
  switch (toolId) {
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
      const services = await publishingServicesFor(context.actor);
      const response = await services.media.list(context.actor, validated.data);
      if (!response.ok) {
        const status = response.error.error.code === 'FORBIDDEN' ? 403 : response.error.error.code === 'RESOURCE_UNAVAILABLE' ? 404 : 400;
        return NextResponse.json(response.error, { status });
      }
      result = response.value;
      break;
    }
    case 'publishing.delivery.read': {
      const services = await publishingServicesFor(context.actor);
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

  const context = await resolveContext(parsedOrganization.data, requestId, request.headers);
  if (context === null) {
    return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  }

  return NextResponse.json({
    organizationId: context.actor.organizationId,
    tools: listAiOperatorTools(context.actor, 'tenant'),
  });
}

export const GET = withApiAccess('GET /api/dashboard/operator', handleGET);
export const POST = withApiAccess('POST /api/dashboard/operator', handlePOST);
