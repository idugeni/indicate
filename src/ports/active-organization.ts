import type { ActiveOrganizationState } from '@/domain/authorization/rbac';

export interface ActiveOrganizationStore {
  read(): Promise<ActiveOrganizationState>;
  clearTenantState(previousOrganizationId: string | null): Promise<void>;
  write(next: ActiveOrganizationState): Promise<void>;
}
