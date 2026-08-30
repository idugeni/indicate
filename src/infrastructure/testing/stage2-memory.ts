import type { ActiveOrganizationState, LocalUserIdentity, MembershipAuthorization, PersistedActorAuthorization, TenantResourceReference } from '@/domain/authorization/rbac';
import type { ActorType } from '@/domain/context/operation-context';
import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { SeedDomainRecord, SeedRegionRecord } from '@/domain/seed/mvp-seed';
import type { ActiveOrganizationStore } from '@/ports/active-organization';
import type { AuthorizationRepository } from '@/ports/authorization-repository';
import type { SeedRepository, SeedTransaction } from '@/ports/seed-repository';
import type { NewAuditEvent, TenantTransaction, TenantTransactionManager } from '@/ports/tenant-transaction';

interface MemoryState {
  usersByAuth: Map<string, LocalUserIdentity>;
  usersById: Map<string, LocalUserIdentity>;
  memberships: Map<string, MembershipAuthorization>;
  actorAuthorizations: Map<string, PersistedActorAuthorization>;
  resources: Map<string, string>;
  domains: Map<string, SeedDomainRecord>;
  regions: Map<string, SeedRegionRecord>;
  seedRuns: Set<string>;
  tenantValues: Map<string, string>;
  auditLogs: readonly (NewAuditEvent & { readonly organizationId: string; readonly actorId: string })[];
}

function cloneState(state: MemoryState): MemoryState {
  return {
    usersByAuth: new Map(state.usersByAuth),
    usersById: new Map(state.usersById),
    memberships: new Map([...state.memberships].map(([key, value]) => [key, { ...value, permissions: new Set(value.permissions) }])),
    actorAuthorizations: new Map([...state.actorAuthorizations].map(([key, value]) => [key, { ...value, permissions: new Set(value.permissions) }])),
    resources: new Map(state.resources),
    domains: new Map(state.domains),
    regions: new Map(state.regions),
    seedRuns: new Set(state.seedRuns),
    tenantValues: new Map(state.tenantValues),
    auditLogs: state.auditLogs.map((event) => ({ ...event })),
  };
}

const membershipKey = (organizationId: string, userId: string) => `${organizationId}:${userId}`;
const actorAuthorizationKey = (actorType: ActorType, organizationId: string, actorId: string) => `${actorType}:${organizationId}:${actorId}`;
const resourceKey = (type: string, id: string) => `${type}:${id}`;

export class InMemoryStage2Database implements AuthorizationRepository, SeedRepository, TenantTransactionManager {
  private state: MemoryState = {
    usersByAuth: new Map(),
    usersById: new Map(),
    memberships: new Map(),
    actorAuthorizations: new Map(),
    resources: new Map(),
    domains: new Map(),
    regions: new Map(),
    seedRuns: new Set(),
    tenantValues: new Map(),
    auditLogs: [],
  };

  failAudit = false;
  failSeedAfterOperations: number | null = null;

  addUser(user: LocalUserIdentity): void {
    this.state.usersByAuth.set(user.authUserId, user);
    this.state.usersById.set(user.id, user);
  }

  addMembership(membership: MembershipAuthorization): void {
    this.state.memberships.set(membershipKey(membership.organizationId, membership.userId), {
      ...membership,
      permissions: new Set(membership.permissions),
    });
  }

  addActorAuthorization(
    actorType: Exclude<ActorType, 'user'>,
    authorization: PersistedActorAuthorization,
  ): void {
    this.state.actorAuthorizations.set(
      actorAuthorizationKey(actorType, authorization.organizationId, authorization.actorId),
      { ...authorization, permissions: new Set(authorization.permissions) },
    );
  }

  addResource(type: string, id: string, organizationId: string): void {
    this.state.resources.set(resourceKey(type, id), organizationId);
  }

  setTenantValue(organizationId: string, key: string, value: string): void {
    this.state.tenantValues.set(`${organizationId}:${key}`, value);
  }

  getTenantValue(organizationId: string, key: string): string | null {
    return this.state.tenantValues.get(`${organizationId}:${key}`) ?? null;
  }

  snapshot() {
    return Object.freeze({
      users: [...this.state.usersById.values()].map((value) => ({ ...value })),
      domains: [...this.state.domains.values()].map((value) => ({ ...value })),
      regions: [...this.state.regions.values()].map((value) => ({ ...value })),
      auditLogs: this.state.auditLogs.map((value) => ({ ...value })),
      memberships: [...this.state.memberships.values()].map((value) => ({ ...value, permissions: [...value.permissions] })),
      tenantValues: [...this.state.tenantValues.entries()],
    });
  }

  async listActiveOrganizationsForUser(verifiedAuthUserId: string) {
    const user = this.state.usersByAuth.get(verifiedAuthUserId);
    if (user === undefined || user.status !== 'active') return [];
    return [...this.state.memberships.values()]
      .filter((membership) => membership.userId === user.id && membership.status === 'active' && membership.roleActive)
      .map((membership) => ({ id: membership.organizationId, name: `Organization ${membership.organizationId.slice(-4)}` }));
  }

  async findLocalUserByAuthIdentity(authUserId: string) {
    return this.state.usersByAuth.get(authUserId) ?? null;
  }

  async linkLocalUser(input: { readonly id: string; readonly authUserId: string; readonly displayName: string }) {
    const existing = this.state.usersByAuth.get(input.authUserId);
    if (existing !== undefined) return existing;
    const user: LocalUserIdentity = Object.freeze({ ...input, status: 'active' });
    this.addUser(user);
    return user;
  }

  async findActiveMembership(organizationId: string, userId: string) {
    const membership = this.state.memberships.get(membershipKey(organizationId, userId));
    return membership?.status === 'active' ? membership : null;
  }

  async findActiveActorAuthorization(
    organizationId: string,
    actorType: Exclude<ActorType, 'user'>,
    actorId: string,
  ) {
    return this.state.actorAuthorizations.get(actorAuthorizationKey(actorType, organizationId, actorId)) ?? null;
  }

  async resourceExists(organizationId: string, resource: { readonly type: string; readonly id: string }) {
    return this.state.resources.get(resourceKey(resource.type, resource.id)) === organizationId;
  }

  async transaction<T>(
    context: string | AuthorizedTenantActorContext,
    operation: ((transaction: SeedTransaction) => Promise<T>) | ((transaction: TenantTransaction) => Promise<T>),
  ): Promise<T> {
    const before = cloneState(this.state);
    try {
      if (typeof context === 'string') {
        let operations = 0;
        const maybeFail = () => {
          operations += 1;
          if (this.failSeedAfterOperations !== null && operations >= this.failSeedAfterOperations) {
            throw new Error('Injected seed failure');
          }
        };
        const seedTransaction: SeedTransaction = {
          reconcileDomain: async (input) => {
            maybeFail();
            const existing = this.state.domains.get(input.normalizedHostname);
            if (existing !== undefined) {
              if (existing.organizationId !== input.organizationId) throw new Error('Seed domain is unavailable');
              return 'unchanged';
            }
            this.state.domains.set(input.normalizedHostname, Object.freeze({ ...input, status: 'inactive' }));
            return 'created';
          },
          reconcileRegion: async (input) => {
            maybeFail();
            const key = `${input.organizationId}:${input.externalKey}`;
            const existing = this.state.regions.get(key);
            if (existing === undefined) {
              this.state.regions.set(key, Object.freeze({ ...input, status: 'active' }));
              return 'created';
            }
            if (existing.name === input.name && existing.slug === input.slug) return 'unchanged';
            this.state.regions.set(key, Object.freeze({ ...existing, name: input.name, slug: input.slug }));
            return 'updated';
          },
          completeRun: async (input) => {
            maybeFail();
            this.state.seedRuns.add(`${input.organizationId}:${input.fingerprint}`);
          },
        };
        return await (operation as (transaction: SeedTransaction) => Promise<T>)(seedTransaction);
      }

      const actor = context;
      const tenantTransaction: TenantTransaction = Object.freeze({
        organizationId: actor.organizationId,
        actor,
        revalidatePermission: async (permission: string) => {
          if (actor.actorType !== 'user') {
            return this.state.actorAuthorizations
              .get(actorAuthorizationKey(actor.actorType, actor.organizationId, actor.actorId))
              ?.permissions.has(permission) ?? false;
          }
          const membership = this.state.memberships.get(membershipKey(actor.organizationId, actor.actorId));
          return membership?.status === 'active'
            && membership.roleActive
            && membership.permissions.has(permission);
        },
        resourceExists: async (resource: TenantResourceReference) => {
          if (resource.type === 'membership') {
            return this.state.memberships.get(membershipKey(actor.organizationId, resource.id))?.status === 'active';
          }
          return this.state.resources.get(resourceKey(resource.type, resource.id)) === actor.organizationId;
        },
        changeMembershipRole: async ({ userId, roleId }: { readonly userId: string; readonly roleId: string }) => {
          const key = membershipKey(actor.organizationId, userId);
          const membership = this.state.memberships.get(key);
          if (membership === undefined) return false;
          this.state.memberships.set(key, { ...membership, roleId });
          return true;
        },
        appendAudit: async (event: NewAuditEvent) => {
          if (this.failAudit) throw new Error('Injected audit failure');
          this.state.auditLogs = [...this.state.auditLogs, Object.freeze({
            ...event,
            organizationId: actor.organizationId,
            actorId: actor.actorId,
          })];
        },
      });
      return await (operation as (transaction: TenantTransaction) => Promise<T>)(tenantTransaction);
    } catch (error) {
      this.state = before;
      throw error;
    }
  }

  async execute<T>(actor: AuthorizedTenantActorContext, operation: (transaction: TenantTransaction) => Promise<T>) {
    return this.transaction(actor, operation);
  }
}

export class InMemoryActiveOrganizationStore implements ActiveOrganizationStore {
  private state: ActiveOrganizationState = Object.freeze({ organizationId: null, generation: 0 });
  readonly clearedOrganizations: (string | null)[] = [];

  async read() { return this.state; }
  async clearTenantState(previousOrganizationId: string | null) { this.clearedOrganizations.push(previousOrganizationId); }
  async write(next: ActiveOrganizationState) { this.state = Object.freeze({ ...next }); }
}
