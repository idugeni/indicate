import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { Stage3TenantState } from '@/domain/stage3/models';
import { STAGE3_PERMISSIONS } from '@/domain/stage3/permissions';
import { InMemoryStage3Repository } from './stage3-memory';

export const STAGE3_USER_ID = '00000000-0000-4000-8000-000000000010';
export const STAGE3_AUTH_USER_ID = '00000000-0000-4000-8000-000000000090';
export const ALPHA_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
export const BETA_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000002';
const ROLE_ID = '00000000-0000-4000-8000-000000000020';
export const ALPHA_DOMAIN_ID = '00000000-0000-4000-8000-000000000101';
export const ALPHA_REGION_ID = '00000000-0000-4000-8000-000000000102';
export const ALPHA_SITE_ID = '00000000-0000-4000-8000-000000000103';
export const ALPHA_PUBLISHER_ID = '00000000-0000-4000-8000-000000000104';
export const ALPHA_CATEGORY_ID = '00000000-0000-4000-8000-000000000105';
export const ALPHA_AUTHOR_ID = '00000000-0000-4000-8000-000000000106';
export const ALPHA_ARTICLE_ID = '00000000-0000-4000-8000-000000000107';

const allPermissions = new Set(Object.values(STAGE3_PERMISSIONS));
const now = '2026-08-30T00:00:00.000Z';
const base = (organizationId: string, id: string) => ({ id, organizationId, version: 1, createdAt: now, updatedAt: now });

function tenant(organizationId: string, organizationName: string, suffix: string): Stage3TenantState {
  const domainId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_DOMAIN_ID : '00000000-0000-4000-8000-000000000201';
  const regionId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_REGION_ID : '00000000-0000-4000-8000-000000000202';
  const siteId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_SITE_ID : '00000000-0000-4000-8000-000000000203';
  const publisherId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_PUBLISHER_ID : '00000000-0000-4000-8000-000000000204';
  const categoryId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_CATEGORY_ID : '00000000-0000-4000-8000-000000000205';
  const authorId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_AUTHOR_ID : '00000000-0000-4000-8000-000000000206';
  const articleId = organizationId === ALPHA_ORGANIZATION_ID ? ALPHA_ARTICLE_ID : '00000000-0000-4000-8000-000000000207';
  return {
    organizationId, organizationName,
    domains: [{ ...base(organizationId, domainId), normalizedHostname: `${suffix}.example.test`, status: 'active' }],
    regions: [{ ...base(organizationId, regionId), externalKey: `region-${suffix}`, name: `${organizationName} Region`, slug: `region-${suffix}`, status: 'active' }],
    sites: [{ ...base(organizationId, siteId), domainId, regionId, normalizedHostname: `region-${suffix}.${suffix}.example.test`, status: 'active', activationState: 'active' }],
    siteSettings: [{ ...base(organizationId, siteId), siteId, name: `${organizationName} News`, description: `${organizationName} publication`, colors: { primary: '#173f75' }, socialLinks: {}, seo: {}, navigation: [{ label: 'Home', path: '/' }] }],
    roles: [{ ...base(organizationId, ROLE_ID), name: 'Administrator', active: true, permissions: allPermissions }],
    memberships: [{ ...base(organizationId, STAGE3_USER_ID), userId: STAGE3_USER_ID, displayName: 'Stage 3 Test Editor', roleId: ROLE_ID, status: 'active' }],
    telegramMappings: [],
    publishers: [{ ...base(organizationId, publisherId), name: `${organizationName} Publisher`, type: 'independent_publisher', attributionLabel: `${organizationName} Independent`, contacts: {}, evidenceReference: 'evidence/reference', verificationStatus: 'verified', submittedBy: STAGE3_USER_ID, submittedAt: now, verifiedBy: STAGE3_USER_ID, verifiedAt: now, rejectionReason: null, status: 'active' }],
    affiliations: [],
    categories: [{ ...base(organizationId, categoryId), name: 'Local', slug: 'local', status: 'active' }],
    authors: [{ ...base(organizationId, authorId), displayName: `${organizationName} Author`, byline: 'Editorial Desk', status: 'active' }],
    articles: [{ ...base(organizationId, articleId), regionId, publisherId, categoryId, authorId, slug: `${suffix}-welcome`, title: `${organizationName} canonical article`, body: `Canonical body for ${organizationName}`, source: `${organizationName} Publisher`, status: 'active', publishedAt: now, archivedAt: null }],
    articleSites: [{ ...base(organizationId, `${articleId.slice(0, -3)}301`), articleId, siteId, state: 'published', stateOccurredAt: now, publishedUrl: `https://region-${suffix}.${suffix}.example.test/${suffix}-welcome`, publishedAt: now, active: true }],
    media: [], publishingJobs: [], publishingJobTargets: [], auditLogs: [],
  };
}

export function createStage3RepositoryFixture() {
  const repository = new InMemoryStage3Repository([
    tenant(ALPHA_ORGANIZATION_ID, 'Organization Alpha', 'alpha'),
    tenant(BETA_ORGANIZATION_ID, 'Organization Beta', 'beta'),
  ]);
  return { repository };
}

export function createStage3Actor(organizationId = ALPHA_ORGANIZATION_ID, requestId = 'stage3-request'): AuthorizedTenantActorContext {
  return Object.freeze({ actorType: 'user', actorId: STAGE3_USER_ID, verifiedAuthUserId: STAGE3_AUTH_USER_ID, organizationId, permissionSet: new Set(allPermissions), entryPoint: 'cms', requestId });
}

const globalFixture = globalThis as typeof globalThis & { __indicateStage3Fixture?: ReturnType<typeof createStage3RepositoryFixture> };
export function getStage3E2eRepositoryFixture() {
  globalFixture.__indicateStage3Fixture ??= createStage3RepositoryFixture();
  return globalFixture.__indicateStage3Fixture;
}
