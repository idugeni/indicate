import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { createNonDisclosingDenial, createPublicError } from '@/core/errors';
import { resolveRequestId } from '@/core/observability/request-id';
import { withApiAccess } from '@/core/observability/api-access';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { isPlatformOnlyWithoutTicket } from '@/core/routing/platform-guard';
import { fetchCachedAnalytics, fetchCachedDashboard, NextDashboardCacheInvalidator } from '@/modules/dashboard/dashboard-dal';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { authorizeAiOperatorTool, getAiOperatorTool } from '@/modules/ai-operator/tool-registry';

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

  return NextResponse.json({ toolId, requestId, result });
}

export const POST = withApiAccess('POST /api/dashboard/operator', handlePOST);
