import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { Stage3TenantState } from '@/domain/stage3/models';
import { STAGE3_PERMISSIONS } from '@/application/stage3/tenant-business-service';

export const ORG_ID = '00000000-0000-4000-8000-000000000001';
export const USER_ID = '00000000-0000-4000-8000-000000000010';
export const AUTH_USER_ID = '00000000-0000-4000-8000-000000000090';
export const ROLE_ID = '00000000-0000-4000-8000-000000000020';
const now = '2026-08-30T00:00:00.000Z';

export function stage3Actor(requestId = 'stage3-test'): AuthorizedTenantActorContext {
  return { actorType: 'user', actorId: USER_ID, verifiedAuthUserId: AUTH_USER_ID, organizationId: ORG_ID, permissionSet: new Set(), entryPoint: 'cms', requestId };
}

export function emptyStage3State(overrides: Partial<Stage3TenantState> = {}): Stage3TenantState {
  return {
    organizationId: ORG_ID, organizationName: 'Test Organization', domains: [], regions: [], sites: [], siteSettings: [],
    roles: [{ id: ROLE_ID, organizationId: ORG_ID, name: 'Admin', active: true, permissions: new Set(Object.values(STAGE3_PERMISSIONS)), version: 1, createdAt: now, updatedAt: now }],
    memberships: [{ id: USER_ID, organizationId: ORG_ID, userId: USER_ID, displayName: 'Editor', roleId: ROLE_ID, status: 'active', version: 1, createdAt: now, updatedAt: now }],
    telegramMappings: [],
    publishers: [], affiliations: [], categories: [], authors: [], articles: [], articleSites: [], media: [], publishingJobs: [], publishingJobTargets: [], auditLogs: [],
    ...overrides,
  };
}

export class SequenceIdentifierGenerator {
  private current = 100;
  create(): string { this.current += 1; return `00000000-0000-4000-8000-${String(this.current).padStart(12, '0')}`; }
}

export const base = (id: string) => ({ id, organizationId: ORG_ID, version: 1, createdAt: now, updatedAt: now });
