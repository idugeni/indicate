import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { AuditRecord, Stage3TenantState } from '@/domain/stage3/models';
import {
  Stage3AccessDeniedError,
  type MutableTenantState,
  type Stage3Repository,
  type Stage3Transaction,
} from '@/ports/stage3-repository';
import { redact } from '@/shared/security/redaction';

function cloneState(state: Stage3TenantState): MutableTenantState {
  return structuredClone(state) as MutableTenantState;
}

function freezeState(state: Stage3TenantState): Stage3TenantState {
  const clone = cloneState(state);
  for (const role of clone.roles) Object.freeze(role.permissions);
  for (const key of Object.keys(clone) as (keyof Stage3TenantState)[]) {
    const value = clone[key];
    if (Array.isArray(value)) {
      for (const item of value) Object.freeze(item);
      Object.freeze(value);
    }
  }
  return Object.freeze(clone);
}

export class InMemoryStage3Repository implements Stage3Repository {
  private states = new Map<string, MutableTenantState>();
  failNextAudit = false;

  constructor(states: readonly Stage3TenantState[] = []) {
    for (const state of states) this.states.set(state.organizationId, cloneState(state));
  }

  seed(state: Stage3TenantState): void {
    this.states.set(state.organizationId, cloneState(state));
  }

  private authorize(actor: AuthorizedTenantActorContext, permission: string, state: Stage3TenantState): void {
    if (actor.organizationId !== state.organizationId) throw new Stage3AccessDeniedError();
    if (actor.actorType !== 'user') {
      if (!actor.permissionSet.has(permission)) throw new Stage3AccessDeniedError();
      return;
    }
    const membership = state.memberships.find((candidate) => candidate.userId === actor.actorId && candidate.status === 'active');
    const role = membership === undefined ? undefined : state.roles.find((candidate) => candidate.id === membership.roleId && candidate.active);
    if (role === undefined || !role.permissions.has(permission)) throw new Stage3AccessDeniedError();
  }

  async read(actor: AuthorizedTenantActorContext, permission: string): Promise<Stage3TenantState> {
    const state = this.states.get(actor.organizationId);
    if (state === undefined) throw new Stage3AccessDeniedError();
    this.authorize(actor, permission, state);
    return freezeState(state);
  }

  async recordDenied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<void> {
    const state = this.states.get(actor.organizationId);
    if (state === undefined) return;
    state.auditLogs.push(Object.freeze({
      id: crypto.randomUUID(), organizationId: actor.organizationId, actorType: actor.actorType,
      actorId: actor.actorId, entryPoint: actor.entryPoint, action, targetType, targetId: null,
      outcome: 'denied', changedFields: [], before: null, after: null,
      requestId: actor.requestId, occurredAt: new Date().toISOString(),
    }));
  }

  async execute<T>(
    actor: AuthorizedTenantActorContext,
    permission: string,
    operation: (transaction: Stage3Transaction) => T | Promise<T>,
  ): Promise<T> {
    const current = this.states.get(actor.organizationId);
    if (current === undefined) throw new Stage3AccessDeniedError();
    this.authorize(actor, permission, current);
    const working = cloneState(current);
    const transaction: Stage3Transaction = {
      state: working,
      resolveUserDisplayName: async (userId) => working.memberships.find((membership) => membership.userId === userId)?.displayName ?? null,
      appendAudit: (event) => {
        if (this.failNextAudit) {
          this.failNextAudit = false;
          throw new Error('Injected audit persistence failure');
        }
        const now = new Date().toISOString();
        const audit: AuditRecord = Object.freeze({
          ...event,
          id: crypto.randomUUID(),
          organizationId: actor.organizationId,
          actorType: actor.actorType,
          actorId: actor.actorId,
          entryPoint: actor.entryPoint,
          requestId: actor.requestId,
          occurredAt: now,
          before: event.before === null ? null : redact(event.before) as Readonly<Record<string, unknown>>,
          after: event.after === null ? null : redact(event.after) as Readonly<Record<string, unknown>>,
        });
        working.auditLogs.push(audit);
      },
    };
    const result = await operation(transaction);
    this.states.set(actor.organizationId, working);
    return structuredClone(result);
  }

  snapshot(organizationId: string): Stage3TenantState | null {
    const state = this.states.get(organizationId);
    return state === undefined ? null : freezeState(state);
  }
}
