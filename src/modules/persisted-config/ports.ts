import type { PersistedRuntimeConfigReadModel } from '@/core/config/persisted/read-model';

export class RuntimeConfigReadError extends Error {
  constructor(message = 'Runtime configuration read failed') {
    super(message);
    this.name = 'RuntimeConfigReadError';
  }
}

/** Reads one full runtime config in a repeatable-read txn; retries instead of mixing versions. */
export interface RuntimeConfigReadRepository {
  readComplete(environment: string): Promise<PersistedRuntimeConfigReadModel>;
  readInventoryVersion(environment: string): Promise<{ readonly configurationVersion: number }>;
}