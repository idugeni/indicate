import type { SeedReconcileOutcome, SeedRegionDescriptor } from '@/domain/seed/mvp-seed';

export interface SeedTransaction {
  reconcileDomain(input: {
    readonly organizationId: string;
    readonly id: string;
    readonly normalizedHostname: string;
  }): Promise<SeedReconcileOutcome>;
  reconcileRegion(input: SeedRegionDescriptor & {
    readonly organizationId: string;
    readonly id: string;
  }): Promise<SeedReconcileOutcome>;
  completeRun(input: {
    readonly organizationId: string;
    readonly id: string;
    readonly fingerprint: string;
    readonly created: number;
    readonly updated: number;
    readonly unchanged: number;
  }): Promise<void>;
}

export interface SeedRepository {
  transaction<T>(organizationId: string, operation: (transaction: SeedTransaction) => Promise<T>): Promise<T>;
}
