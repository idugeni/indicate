import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { Stage4TenantSnapshot } from '@/domain/stage4/models';
import { STAGE4_PERMISSION_NAMES } from '@/domain/stage4/permissions';

export const TEST_ORG = '00000000-0000-4000-8000-000000000001';
export const TEST_ORG_B = '00000000-0000-4000-8000-000000000002';
export const TEST_ARTICLE = '00000000-0000-4000-8000-000000000101';
export const TEST_SITE = '00000000-0000-4000-8000-000000000201';
export const TEST_SITE_B = '00000000-0000-4000-8000-000000000202';
const now = '2026-08-30T00:00:00.000Z';

export function stage4Actor(organizationId = TEST_ORG): AuthorizedTenantActorContext {
  return { actorType: 'user', actorId: '00000000-0000-4000-8000-000000000010', verifiedAuthUserId: '00000000-0000-4000-8000-000000000090', organizationId, permissionSet: new Set(STAGE4_PERMISSION_NAMES), entryPoint: 'cms', requestId: crypto.randomUUID() };
}

export function stage4State(organizationId = TEST_ORG, articleId = TEST_ARTICLE, siteIds: readonly string[] = [TEST_SITE, TEST_SITE_B]): Stage4TenantSnapshot {
  return { organizationId, articles: [{ id: articleId, organizationId, active: true, leadMediaId: null }], sites: siteIds.map((id) => ({ id, organizationId, active: true, normalizedHostname: `${id.slice(-4)}.example.test`, settingsMediaIds: [] })), articleSites: [], reservations: [], media: [], cleanupTasks: [], invalidationIntents: [], jobs: [], targets: [], transitionReceipts: [], auditLogs: [] };
}

export function acceptanceInput(organizationId = TEST_ORG, idempotencyKey = 'key', fingerprint = 'v1:fingerprint') {
  return { jobId: crypto.randomUUID(), organizationId, articleId: TEST_ARTICLE, siteIds: [TEST_SITE, TEST_SITE_B], idempotencyKey, fingerprint, fingerprintVersion: 1, options: { mode: 'immediate' as const }, now, targetIds: [crypto.randomUUID(), crypto.randomUUID()], articleSiteIds: [crypto.randomUUID(), crypto.randomUUID()] };
}
