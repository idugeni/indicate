import { cookies } from 'next/headers';
import { after, NextResponse } from 'next/server';
import { z } from 'zod';

import { authenticateDashboardUser, authorizeDashboardOrganization } from '@/modules/auth/authenticate-dashboard';
import { AI_EMBED_OPERATION_REINDEX, type AiOperationControls } from '@/modules/ai/ai-operation-guards';
import { reindexArticleEmbeddings } from '@/modules/ai/ai-embeddings';
import { createAiBudgetGuard } from '@/modules/ai/ai-security';
import { createAiModelRateLimitStore } from '@/modules/ai/ai-rate-limit';
import { TenantBusinessService } from '@/modules/dashboard/tenant-business-service';
import { fetchCachedAnalytics, fetchCachedDashboard, NextDashboardCacheInvalidator } from '@/modules/dashboard/dashboard-dal';
import { denyCrossSiteMutation } from '@/core/security/mutation-guard';
import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import { getSharedRuntimeDatabase } from '@/data/client';
import { deliveryOperationsComposition } from '@/modules/delivery';
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
  view: z.enum(['dashboard', 'configuration', 'publishers', 'editorial', 'taxonomy', 'articles', 'published', 'analytics', 'audit', 'operations']),
  regionId: organizationSchema.optional(), siteId: organizationSchema.optional(), categoryId: organizationSchema.optional(), publisherId: organizationSchema.optional(), authorId: organizationSchema.optional(),
  publicationState: z.enum(['queued', 'processing', 'published', 'failed', 'retrying', 'unpublished']).optional(), search: z.string().max(300).optional(),
  siteHostname: z.string().max(253).optional(),
  actorId: z.string().max(200).optional(), action: z.string().max(200).optional(), targetType: z.string().max(100).optional(), outcome: z.enum(['succeeded', 'denied', 'failed']).optional(),
  from: z.iso.datetime().optional(), to: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(), cursor: z.string().max(200).optional(),
  status: z.enum(['draft', 'in_review', 'scheduled', 'active', 'archived']).optional(), tag: z.string().max(60).optional(),
  sort: z.enum(['updated', 'published-desc', 'published-asc', 'title', 'syndicated']).optional(),
  scope: z.enum(['all']).optional(),
});
const commandSchema = z.object({ organizationId: organizationSchema, action: z.string().min(1).max(100), payload: z.unknown() });

interface ServiceContext { readonly actor: AuthorizedTenantActorContext; readonly service: TenantBusinessService }
type ContextResult = ServiceContext | ReturnType<typeof createNonDisclosingDenial>;
const isContextError = (value: ContextResult): value is ReturnType<typeof createNonDisclosingDenial> => 'error' in value;
/**
 * Maps a denial envelope to its HTTP status.
 *
 * @param error - Envelope produced by `createNonDisclosingDenial` or `createPublicError`.
 * @returns Status code honoring 403/429 for subscription and purge cooldown denials.
 */
export const responseStatus = (error: ReturnType<typeof createNonDisclosingDenial>) => error.error.code === 'RESOURCE_UNAVAILABLE' ? 404
  : error.error.code === 'INVALID_INPUT' ? 400 : error.error.code === 'FORBIDDEN' ? 403 : error.error.code === 'CONFLICT' ? 409
    : error.error.code === 'RATE_LIMITED' ? 429 : error.error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;

async function contextFor(organizationId: string, requestId: string, headers: Headers): Promise<ContextResult> {
  const cookieStore = await cookies();
  const context = await getServerRuntimeContext();
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const user = await authenticateDashboardUser(runtime.db, cookieStore, requestId);
  if (user === null) return createNonDisclosingDenial(requestId);
  if (user.accessKey !== null) {
    if (user.accessKey.actor.organizationId !== organizationId) return createNonDisclosingDenial(requestId);
    if (isPlatformOnlyWithoutTicket({ orgPermissionCount: user.accessKey.actor.permissionSet.size, platformPermissionCount: user.accessKey.actor.platformPermissionSet?.size ?? 0, headers })) {
      return createNonDisclosingDenial(requestId);
    }
    return {
      actor: user.accessKey.actor,
      service: new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator(), undefined, undefined, new NextDashboardCacheInvalidator()),
    };
  }
  const actor = await authorizeDashboardOrganization(runtime.db, user, organizationId, requestId);
  if (actor === null) {
    const deniedActor: AuthorizedTenantActorContext = { actorType: 'user', actorId: user.localUserId, verifiedAuthUserId: user.authUserId, organizationId, permissionSet: new Set(), platformPermissionSet: new Set(), entryPoint: 'dashboard', requestId };
    try { await new DrizzleDashboardRepository(runtime.db).recordDenied(deniedActor, 'dashboard.organization.authorize', 'organization'); }
    catch { return createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', requestId); }
    return createNonDisclosingDenial(requestId);
  }
  if (isPlatformOnlyWithoutTicket({ orgPermissionCount: actor.permissionSet.size, platformPermissionCount: actor.platformPermissionSet?.size ?? 0, headers })) {
    const deniedActor: AuthorizedTenantActorContext = { actorType: 'user', actorId: user.localUserId, verifiedAuthUserId: user.authUserId, organizationId, permissionSet: new Set(), platformPermissionSet: new Set(), entryPoint: 'dashboard', requestId };
    try { await new DrizzleDashboardRepository(runtime.db).recordDenied(deniedActor, 'dashboard.platform_token.denied', 'organization'); }
    catch { return createPublicError('DEPENDENCY_UNAVAILABLE', 'The operation could not be completed.', requestId); }
    return createNonDisclosingDenial(requestId);
  }
  return {
    actor,
    service: new TenantBusinessService(new DrizzleDashboardRepository(runtime.db), new UuidGenerator(), undefined, undefined, new NextDashboardCacheInvalidator()),
  };
}

async function handleGET(request: Request) {
  const requestId = resolveRequestId(request); const url = new URL(request.url);
  const value = (name: string) => url.searchParams.get(name) ?? undefined;
  const parsed = querySchema.safeParse({
    organizationId: value('organizationId'), view: value('view'), regionId: value('regionId'), siteId: value('siteId'), categoryId: value('categoryId'), publisherId: value('publisherId'), authorId: value('authorId'),
    publicationState: value('publicationState'), search: value('search'), siteHostname: value('siteHostname'), status: value('status'), tag: value('tag'), sort: value('sort'), scope: value('scope'),
    limit: value('limit'), cursor: value('cursor'), actorId: value('actorId'), action: value('action'), targetType: value('targetType'), outcome: value('outcome'), from: value('from'), to: value('to'),
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
    const editorialFilter = compact([['regionId', parsed.data.regionId], ['siteId', parsed.data.siteId], ['siteHostname', parsed.data.siteHostname], ['categoryId', parsed.data.categoryId], ['publisherId', parsed.data.publisherId], ['authorId', parsed.data.authorId], ['publicationState', parsed.data.publicationState], ['status', parsed.data.status], ['tag', parsed.data.tag], ['search', parsed.data.search], ['sort', parsed.data.sort], ['limit', parsed.data.limit === undefined ? undefined : String(parsed.data.limit)], ['cursor', parsed.data.cursor]]);
    const crossOrgFilter = compact([['publicationState', parsed.data.view === 'published' ? (parsed.data.publicationState ?? 'published') : undefined], ['status', parsed.data.status], ['tag', parsed.data.tag], ['search', parsed.data.search], ['sort', parsed.data.sort], ['limit', parsed.data.limit === undefined ? undefined : String(parsed.data.limit)], ['cursor', parsed.data.cursor]]);
    const rangeFilter = compact([['from', parsed.data.from], ['to', parsed.data.to]]);
    const auditFilter = { ...rangeFilter, ...compact([['actorId', parsed.data.actorId], ['action', parsed.data.action], ['targetType', parsed.data.targetType], ['outcome', parsed.data.outcome], ['limit', parsed.data.limit === undefined ? undefined : String(parsed.data.limit)], ['cursor', parsed.data.cursor]]) };
    const crossOrg = parsed.data.scope === 'all' && (parsed.data.view === 'articles' || parsed.data.view === 'published');
    if (crossOrg && (parsed.data.regionId !== undefined || parsed.data.siteId !== undefined || parsed.data.siteHostname !== undefined || parsed.data.categoryId !== undefined || parsed.data.publisherId !== undefined || parsed.data.authorId !== undefined)) {
      return NextResponse.json(createPublicError('INVALID_INPUT', 'Mode Semua organisasi tidak menerima filter per-organisasi.', requestId), { status: 400 });
    }
    const result = parsed.data.view === 'dashboard'
      ? actor.actorType === 'user'
        ? await fetchCachedDashboard(actor)
        : { ok: false as const, error: createNonDisclosingDenial(requestId) }
      : parsed.data.view === 'configuration' ? await service.listConfiguration(actor, { search: parsed.data.search })
      : parsed.data.view === 'publishers' ? await service.listPublishers(actor, { search: parsed.data.search })
      : parsed.data.view === 'editorial' ? await service.listEditorial(actor, { ...editorialFilter, limit: 0 })
      : parsed.data.view === 'taxonomy' ? await service.listTaxonomy(actor)
      : parsed.data.view === 'articles'
        ? crossOrg
          ? await service.listCrossOrgEditorial(actor, crossOrgFilter)
          : await service.listEditorial(actor, editorialFilter)
      : parsed.data.view === 'published'
        ? crossOrg
          ? await service.listCrossOrgEditorial(actor, crossOrgFilter)
          : await service.listEditorial(actor, {
            ...editorialFilter,
            publicationState: parsed.data.publicationState ?? 'published',
          })
      : parsed.data.view === 'analytics'
        ? actor.actorType === 'user'
          ? await fetchCachedAnalytics(actor, rangeFilter)
          : { ok: false as const, error: createNonDisclosingDenial(requestId) }
      : parsed.data.view === 'operations' ? await service.operations(actor)
      : await service.auditLogs(actor, auditFilter);
    return result.ok ? NextResponse.json(result.value) : NextResponse.json(result.error, { status: responseStatus(result.error) });
}

/**
 * Refresh one article's semantic index after the response is sent.
 *
 * @param organizationId - Tenant owning the article.
 * @param value - Command result carrying the saved article id.
 * @remarks Best-effort via `after()`: index freshness never fails a save,
 * and one article's chunks bound the provider and database cost.
 */
function scheduleArticleReindex(organizationId: string, value: unknown): void {
  if (typeof value !== 'object' || value === null) return;
  const articleId = (value as { readonly id?: unknown }).id;
  if (typeof articleId !== 'string' || articleId === '') return;
  after(() => {
    void (async () => {
      try {
        const context = await getServerRuntimeContext();
        const runtime = getSharedRuntimeDatabase(context.bootstrap);
        const redis = context.config.redis;
        const controls: AiOperationControls = {
          db: runtime.db,
          budget: createAiBudgetGuard({ url: redis.url, token: redis.token, namespace: redis.namespace }),
          store: createAiModelRateLimitStore({ url: redis.url, token: redis.token, namespace: redis.namespace }),
        };
        await reindexArticleEmbeddings(
          runtime.db,
          { organizationId, articleId },
          { controls, operation: AI_EMBED_OPERATION_REINDEX },
        );
      } catch {
        /* Stale vectors stay queryable; the next save retries. */
      }
    })();
  });
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
      'site.create': (payload) => service.createSite(actor, payload), 'site.update': (payload) => service.updateSite(actor, payload), 'site.settings.update': (payload) => service.saveSiteSettings(actor, payload), 'site.cache.purge': (payload) => service.purgeSiteCache(actor, payload),
      'role.create': (payload) => service.createRole(actor, payload), 'role.update': (payload) => service.updateRole(actor, payload), 'membership.update': (payload) => service.saveMembership(actor, payload),
      'invitation.create': (payload) => service.createInvitation(actor, payload), 'invitation.revoke': (payload) => service.revokeInvitation(actor, payload),      'publisher.create': (payload) => service.createPublisher(actor, payload), 'publisher.update': (payload) => service.updatePublisher(actor, payload), 'publisher.submit': (payload) => service.submitPublisher(actor, payload), 'publisher.approve': (payload) => service.approvePublisher(actor, payload), 'publisher.reject': (payload) => service.rejectPublisher(actor, payload), 'publisher.archive': (payload) => service.archivePublisher(actor, payload), 'affiliation.create': (payload) => service.createAffiliation(actor, payload), 'affiliation.update': (payload) => service.updateAffiliation(actor, payload),
      'category.create': (payload) => service.createCategory(actor, payload), 'category.update': (payload) => service.updateCategory(actor, payload), 'category.delete': (payload) => service.deleteCategory(actor, payload), 'tag.rename': (payload) => service.renameTag(actor, payload), 'tag.remove': (payload) => service.removeTag(actor, payload), 'author.create': (payload) => service.createAuthor(actor, payload), 'author.update': (payload) => service.updateAuthor(actor, payload),
      'article.create': (payload) => service.createArticle(actor, payload), 'article.update': (payload) => service.updateArticle(actor, payload), 'article.updates.list': (payload) => service.listArticleUpdates(actor, payload), 'article.updates.create': (payload) => service.createArticleUpdate(actor, payload), 'article.updates.update': (payload) => service.updateArticleUpdate(actor, payload), 'article.updates.delete': (payload) => service.deleteArticleUpdate(actor, payload), 'article.bridge.request': (payload) => service.requestBridgePublication(actor, payload), 'article.bridge.requestAuto': (payload) => service.requestBridgePublicationAuto(actor, payload), 'article.bridge.unpublish': (payload) => service.unpublishBridge(actor, payload), 'article.inbox.list': () => service.listForOrgInbox(actor), 'article.archive': (payload) => service.archiveArticle(actor, payload), 'article.restore': (payload) => service.restoreArticle(actor, payload), 'article.delete': (payload) => service.deleteArticle(actor, payload), 'article.sites.assign': (payload) => service.assignArticleSites(actor, payload), 'article.sites.views.set': (payload) => service.setArticleSiteViews(actor, payload), 'article.sites.views.setMany': (payload) => service.setArticleSiteViewsMany(actor, payload),
    };
    const action = actions[parsed.data.action]; if (action === undefined) return NextResponse.json(createPublicError('INVALID_INPUT', 'Unknown command.', requestId), { status: 400 });
    const result = await action(parsed.data.payload);
    if (result.ok && (parsed.data.action === 'article.create' || parsed.data.action === 'article.update')) {
      const ownerOrg = (result.value as { readonly organizationId?: unknown }).organizationId;
      scheduleArticleReindex(typeof ownerOrg === 'string' && ownerOrg !== '' ? ownerOrg : parsed.data.organizationId, result.value);
    }
    if (!result.ok) return NextResponse.json(result.error, { status: responseStatus(result.error) });
    if (parsed.data.action === 'site.cache.purge') {
      try {
        const operations = await deliveryOperationsComposition();
        const dispatch = await operations.invalidation.dispatch(new Date(), operations.config.publishing.batchSize);
        return NextResponse.json({ ...(result.value as Record<string, unknown>), dispatched: dispatch });
      } catch {
        return NextResponse.json({ ...(result.value as Record<string, unknown>), dispatched: null });
      }
    }
    return NextResponse.json(result.value);
}

/**
 * Serve dashboard workspace reads.
 *
 * @remarks Platform-only callers need an on_behalf ticket for dashboard surfaces; otherwise deny + audit.
 */
export const GET = withApiAccess('GET /api/dashboard/workspace', handleGET);
export const POST = withApiAccess('POST /api/dashboard/workspace', handlePOST);
