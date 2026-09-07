import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveVerifiedLocalUser } from '@/modules/auth/resolve-authenticated-user';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { getPublicConfig } from '@/core/config/public-config';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { createSupabaseSsrAuthAdapter, createHardenedSupabaseCookieStore } from '@/integrations/supabase/supabase-ssr';
import { getSharedRuntimeDatabase } from '@/data/client';
import { DrizzleAuthorizationRepository } from '@/data/repos/tenancy/authorization';
import { DrizzleDashboardRepository } from '@/data/repos/dashboard';
import { UuidGenerator } from '@/core/system/uuid-generator';
import { withApiAccess } from '@/core/observability/api-access';
import { resolveRequestId } from '@/core/observability/request-id';
import { isPlatformOnlyWithoutTicket } from '@/core/routing/platform-guard';
import { createNonDisclosingDenial, createPublicError, type PublicErrorEnvelope } from '@/core/errors';
import type { Result } from '@/core/result';

const organizationSchema = z.uuid();
const querySchema = z.object({
  organizationId: organizationSchema,
  view: z.enum(['dashboard', 'configuration', 'publishers', 'editorial', 'analytics', 'audit']),
  regionId: organizationSchema.optional(), siteId: organizationSchema.optional(), categoryId: organizationSchema.optional(), publisherId: organizationSchema.optional(), authorId: organizationSchema.optional(),
  publicationState: z.enum(['queued', 'processing', 'published', 'failed', 'retrying', 'unpublished']).optional(), search: z.string().max(300).optional(),
  actorId: z.string().max(200).optional(), action: z.string().max(200).optional(), targetType: z.string().max(100).optional(), outcome: z.enum(['succeeded', 'denied', 'failed']).optional(),
  from: z.iso.datetime().optional(), to: z.iso.datetime().optional(),
});
const commandSchema = z.object({ organizationId: organizationSchema, action: z.string().min(1).max(100), payload: z.unknown() });

interface ServiceContext { readonly actor: AuthorizedTenantActorContext; readonly service: TenantBusinessService }
type ContextResult = ServiceContext | ReturnType<typeof createNonDisclosingDenial>;
const isContextError = (value: ContextResult): value is ReturnType<typeof createNonDisclosingDenial> => 'error' in value;
const responseStatus = (error: ReturnType<typeof createNonDisclosingDenial>) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404
  : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'CONFLICT' ? 409
    : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;

async function contextFor(organizationId: string, requestId: string, headers: Headers): Promise<ContextResult> {
  const cookieStore = await cookies();
  const publicConfig = getPublicConfig(process.env);
  const auth = createSupabaseSsrAuthAdapter({ url: publicConfig.supabaseUrl, publishableKey: publicConfig.supabasePublishableKey, cookies: createHardenedSupabaseCookieStore({ getAll: () => cookieStore.getAll().map(({ name, value }) => ({ name, value })), set: (name, value, options) => { cookieStore.set(name, value, options); } }) });
  const identity = await auth.verifyCookieSession(); if (identity === null) return createNonDisclosingDenial(requestId);
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const authorization = new DrizzleAuthorizationRepository(runtime.db);
  const local = await resolveVerifiedLocalUser(identity, authorization, new UuidGenerator());
  if (!local.ok) return createNonDisclosingDenial(requestId);
  const membership = await authorization.findActiveMembership(organizationId, local.value.id);
  if (membership === null || !membership.roleActive) {
    const deniedActor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(), platformPermissionSet: new Set(), entryPoint: 'dashboard', requestId };
    try { await new DrizzleDashboardRepository(runtime.db).recordDenied(deniedActor, 'dashboard.organization.authorize', 'organization'); }
    catch { return createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', requestId); }
    return createNonDisclosingDenial(requestId);
  }
  // Platform-only callers need an on_behalf ticket for dashboard surfaces; otherwise deny + audit.
  if (isPlatformOnlyWithoutTicket({ orgPermissionCount: membership.orgPermissions.size, platformPermissionCount: membership.platformPermissions.size, headers })) {
    const deniedActor: AuthorizedTenantActorContext = { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(), platformPermissionSet: new Set(), entryPoint: 'dashboard', requestId };
    try { await new DrizzleDashboardRepository(runtime.db).recordDenied(deniedActor, 'dashboard.platform_token.denied', 'organization'); }
    catch { return createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', requestId); }
    return createNonDisclosingDenial(requestId);
  }
  return {
    actor: { actorType: 'user', actorId: local.value.id, verifiedAuthUserId: identity.authUserId, organizationId, permissionSet: new Set(membership.orgPermissions), platformPermissionSet: new Set(membership.platformPermissions), entryPoint: 'dashboard', requestId },
    service: new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator()),
  };
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request); const url = new URL(request.url);
  const value = (name: string) => url.searchParams.get(name) ?? undefined;
  const parsed = querySchema.safeParse({
    organizationId: value('organizationId'), view: value('view'), regionId: value('regionId'), siteId: value('siteId'), categoryId: value('categoryId'), publisherId: value('publisherId'), authorId: value('authorId'),
    publicationState: value('publicationState'), search: value('search'), actorId: value('actorId'), action: value('action'), targetType: value('targetType'), outcome: value('outcome'), from: value('from'), to: value('to'),
  });
  if (!parsed.success) {
    const filterIssues = parsed.error.issues.filter((issue) => !['organizationId', 'view'].includes(String(issue.path[0])));
    if (filterIssues.length === 0) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
    const fields: Record<string, string[]> = {};
    for (const issue of filterIssues) { const path = issue.path.join('.') || 'request'; fields[path] = [...(fields[path] ?? []), issue.message]; }
    return NextResponse.json(createPublicError('INVALID_INPUT', 'Please correct the highlighted fields.', requestId, fields), { status: 400 });
  }
  const context = await contextFor(parsed.data.organizationId, requestId, request.headers); if (isContextError(context)) return NextResponse.json(context, { status: responseStatus(context) });
  const { actor, service } = context;
  const compact = (entries: readonly (readonly [string, string | undefined])[]) => Object.fromEntries(entries.filter(([, item]) => item !== undefined));
    const editorialFilter = compact([['regionId', parsed.data.regionId], ['siteId', parsed.data.siteId], ['categoryId', parsed.data.categoryId], ['publisherId', parsed.data.publisherId], ['authorId', parsed.data.authorId], ['publicationState', parsed.data.publicationState], ['search', parsed.data.search]]);
    const rangeFilter = compact([['from', parsed.data.from], ['to', parsed.data.to]]);
    const auditFilter = { ...rangeFilter, ...compact([['actorId', parsed.data.actorId], ['action', parsed.data.action], ['targetType', parsed.data.targetType], ['outcome', parsed.data.outcome]]) };
    const result = parsed.data.view === 'dashboard' ? await service.dashboard(actor)
      : parsed.data.view === 'configuration' ? await service.listConfiguration(actor)
      : parsed.data.view === 'publishers' ? await service.listPublishers(actor)
      : parsed.data.view === 'editorial' ? await service.listEditorial(actor, editorialFilter)
      : parsed.data.view === 'analytics' ? await service.analytics(actor, rangeFilter) : await service.auditLogs(actor, auditFilter);
    return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: responseStatus(result.error) });
}

async function handlePOST(request: Request) {
  const requestId = resolveRequestId(request);
  if (denyCrossSiteMutation(request)) return NextResponse.json(createNonDisclosingDenial(requestId), { status: 404 });
  const parsed = commandSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(createPublicError('INVALID_INPUT', 'Invalid command.', requestId), { status: 400 });
  const context = await contextFor(parsed.data.organizationId, requestId, request.headers); if (isContextError(context)) return NextResponse.json(context, { status: responseStatus(context) });
  const { actor, service } = context;
  const actions: Readonly<Record<string, (payload: unknown) => Promise<Result<unknown, PublicErrorEnvelope>>>> = {
      'domain.create': (payload) => service.createDomain(actor, payload), 'domain.update': (payload) => service.updateDomain(actor, payload),
      'region.create': (payload) => service.createRegion(actor, payload), 'region.update': (payload) => service.updateRegion(actor, payload),
      'site.create': (payload) => service.createSite(actor, payload), 'site.update': (payload) => service.updateSite(actor, payload), 'site.settings.update': (payload) => service.saveSiteSettings(actor, payload),
      'role.create': (payload) => service.createRole(actor, payload), 'role.update': (payload) => service.updateRole(actor, payload), 'membership.update': (payload) => service.saveMembership(actor, payload),
      'publisher.create': (payload) => service.createPublisher(actor, payload), 'publisher.update': (payload) => service.updatePublisher(actor, payload), 'publisher.submit': (payload) => service.submitPublisher(actor, payload), 'publisher.approve': (payload) => service.approvePublisher(actor, payload), 'publisher.reject': (payload) => service.rejectPublisher(actor, payload), 'publisher.archive': (payload) => service.archivePublisher(actor, payload), 'affiliation.create': (payload) => service.createAffiliation(actor, payload), 'affiliation.update': (payload) => service.updateAffiliation(actor, payload),
      'category.create': (payload) => service.createCategory(actor, payload), 'category.update': (payload) => service.updateCategory(actor, payload), 'author.create': (payload) => service.createAuthor(actor, payload), 'author.update': (payload) => service.updateAuthor(actor, payload),
      'article.create': (payload) => service.createArticle(actor, payload), 'article.update': (payload) => service.updateArticle(actor, payload), 'article.archive': (payload) => service.archiveArticle(actor, payload), 'article.restore': (payload) => service.restoreArticle(actor, payload), 'article.sites.assign': (payload) => service.assignArticleSites(actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown command.', requestId), { status: 400 });
    const result = await action(parsed.data.payload);
    return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: responseStatus(result.error) });
}

export const GET = withApiAccess('GET /api/dashboard/workspace', handleGET);
export const POST = withApiAccess('POST /api/dashboard/workspace', handlePOST);
