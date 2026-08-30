import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { Stage4TenantSnapshot } from '@/domain/stage4/models';
import { STAGE4_PERMISSION_NAMES } from '@/domain/stage4/permissions';
import {
  ALPHA_ARTICLE_ID, ALPHA_ORGANIZATION_ID, ALPHA_SITE_ID, BETA_ORGANIZATION_ID, STAGE3_AUTH_USER_ID, STAGE3_USER_ID,
} from './stage3-fixture';
import { InMemoryStage4Repository } from './stage4-memory';
import { DeterministicPublicationTargetPublisher, InMemoryObjectStorage, InMemoryRedisCoordination } from './stage4-providers';

export const ALPHA_SECOND_SITE_ID = '00000000-0000-4000-8000-000000000108';
export const BETA_SITE_ID = '00000000-0000-4000-8000-000000000203';
export const BETA_ARTICLE_ID = '00000000-0000-4000-8000-000000000207';
const now = '2026-08-30T00:00:00.000Z';
const empty = (organizationId: string, articleId: string, siteIds: readonly string[]): Stage4TenantSnapshot => ({
  organizationId,
  articles: [{ id: articleId, organizationId, active: true, leadMediaId: null }],
  sites: siteIds.map((id, index) => ({ id, organizationId, active: true, normalizedHostname: `${index === 0 ? 'primary' : 'secondary'}.${organizationId.slice(-4)}.example.test`, settingsMediaIds: [] })),
  articleSites: siteIds.slice(0, 1).map((siteId) => ({ id: crypto.randomUUID(), organizationId, articleId, siteId, active: true, state: 'published', publishedUrl: `https://${siteId}.published.invalid/welcome`, publishedAt: now, version: 1 })),
  reservations: [], media: [], cleanupTasks: [], invalidationIntents: [], jobs: [], targets: [], transitionReceipts: [], auditLogs: [],
});

export function createStage4RepositoryFixture() {
  const repository = new InMemoryStage4Repository([
    empty(ALPHA_ORGANIZATION_ID, ALPHA_ARTICLE_ID, [ALPHA_SITE_ID, ALPHA_SECOND_SITE_ID]),
    empty(BETA_ORGANIZATION_ID, BETA_ARTICLE_ID, [BETA_SITE_ID]),
  ]);
  const storage = new InMemoryObjectStorage(); const queue = new InMemoryRedisCoordination(); const publisher = new DeterministicPublicationTargetPublisher();
  return { repository, storage, queue, publisher };
}

export function createStage4Actor(organizationId = ALPHA_ORGANIZATION_ID, requestId = 'stage4-request'): AuthorizedTenantActorContext {
  return Object.freeze({ actorType: 'user', actorId: STAGE3_USER_ID, verifiedAuthUserId: STAGE3_AUTH_USER_ID, organizationId, permissionSet: new Set(STAGE4_PERMISSION_NAMES), entryPoint: 'cms', requestId });
}

const globalFixture = globalThis as typeof globalThis & { __indicateStage4Fixture?: ReturnType<typeof createStage4RepositoryFixture> };
export function getStage4E2eFixture() { globalFixture.__indicateStage4Fixture ??= createStage4RepositoryFixture(); return globalFixture.__indicateStage4Fixture; }
