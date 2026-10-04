import type { SnapshotSharedStore } from '@/core/system/runtime-config-snapshot-cache';

/**
 * Fans one shared snapshot layer out over ordered stores: first non-null read
 * wins, writes and touches reach every layer best-effort.
 */
export class CompositeSnapshotStore implements SnapshotSharedStore {
  private readonly stores: readonly SnapshotSharedStore[];

  constructor(stores: readonly SnapshotSharedStore[]) {
    this.stores = stores;
  }

  async read(environment: string, revision: number): Promise<unknown | null> {
    for (const store of this.stores) {
      try {
        const hit = await store.read(environment, revision);
        if (hit !== null) return hit;
      } catch {
        /* next layer */
      }
    }
    return null;
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    await Promise.allSettled(this.stores.map((store) => store.write(environment, revision, model, ttlSeconds)));
  }

  async touch(environment: string, revision: number, ttlSeconds: number): Promise<void> {
    await Promise.allSettled(this.stores.map((store) => store.touch(environment, revision, ttlSeconds)));
  }
}
