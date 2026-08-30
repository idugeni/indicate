import type { ActiveOrganizationState } from '@/domain/authorization/rbac';
import type { ActorContext, AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { ActiveOrganizationStore } from '@/ports/active-organization';
import type { AuthorizationRepository } from '@/ports/authorization-repository';
import { createNonDisclosingDenial, type PublicErrorEnvelope } from '@/shared/errors/application-error';
import type { Result } from '@/shared/types/result';

export class ActiveOrganizationService {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly store: ActiveOrganizationStore,
  ) {}

  async switchOrganization(
    actor: ActorContext,
    organizationId: string,
  ): Promise<Result<{ readonly actor: AuthorizedTenantActorContext; readonly state: ActiveOrganizationState }, PublicErrorEnvelope>> {
    if (actor.actorType !== 'user') {
      return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    }
    const membership = await this.repository.findActiveMembership(organizationId, actor.actorId);
    if (membership === null || membership.status !== 'active' || !membership.roleActive) {
      return { ok: false, error: createNonDisclosingDenial(actor.requestId) };
    }
    const previous = await this.store.read();
    await this.store.clearTenantState(previous.organizationId);
    const state = Object.freeze({ organizationId, generation: previous.generation + 1 });
    await this.store.write(state);
    return {
      ok: true,
      value: Object.freeze({
        actor: Object.freeze({ ...actor, organizationId, permissionSet: new Set(membership.permissions) }),
        state,
      }),
    };
  }
}
