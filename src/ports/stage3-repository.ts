import type { AuthorizedTenantActorContext } from '@/domain/context/operation-context';
import type { AuditRecord, Stage3TenantState } from '@/domain/stage3/models';

export type MutableTenantState = {
  -readonly [Key in keyof Stage3TenantState]: Stage3TenantState[Key] extends readonly (infer Item)[] ? Item[] : Stage3TenantState[Key];
};

export interface Stage3Transaction {
  readonly state: MutableTenantState;
  resolveUserDisplayName(userId: string): Promise<string | null>;
  appendAudit(event: Omit<AuditRecord, 'id' | 'organizationId' | 'actorType' | 'actorId' | 'entryPoint' | 'requestId' | 'occurredAt'>): void;
}

export interface Stage3Repository {
  read(actor: AuthorizedTenantActorContext, permission: string): Promise<Stage3TenantState>;
  recordDenied(actor: AuthorizedTenantActorContext, action: string, targetType: string): Promise<void>;
  execute<T>(
    actor: AuthorizedTenantActorContext,
    permission: string,
    operation: (transaction: Stage3Transaction) => T | Promise<T>,
  ): Promise<T>;
}

export class Stage3AccessDeniedError extends Error {
  constructor() { super('Stage 3 tenant resource unavailable'); }
}

export class Stage3ConflictError extends Error {
  constructor() { super('The record was changed by another operation.'); }
}
