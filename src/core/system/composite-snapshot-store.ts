import type { SnapshotSharedStore } from '@/core/system/runtime-config-snapshot-cache';

/**
 * Fans one shared snapshot layer out over ordered stores: first non-null read
 * wins, writes and touches reach every layer best-effort.
 */
export class CompositeSnapshotStore implements SnapshotSharedStore {
  private readonly stores: readonly SnapshotSharedStore[];
  private readonly pendingBackfills = new WeakMap<object, readonly SnapshotSharedStore[]>();

  constructor(stores: readonly SnapshotSharedStore[]) {
    this.stores = stores;
  }

  async read(environment: string, revision: number): Promise<unknown | null> {
    const missedStores: SnapshotSharedStore[] = [];
    for (const store of this.stores) {
      try {
        const hit = await store.read(environment, revision);
        if (hit !== null) {
          if (missedStores.length > 0 && typeof hit === 'object' && hit !== null) {
            this.pendingBackfills.set(hit, [...missedStores]);
          }
          return hit;
        }
        missedStores.push(store);
      } catch {
        missedStores.push(store);
        /* next layer */
      }
    }
    return null;
  }

  /**
   * Restore faster layers after the caller validates a hit from a later layer.
   * Invalid snapshots are never copied into an earlier cache by this method.
   */
  async backfill(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    if (typeof model !== 'object' || model === null) return;
    const targets = this.pendingBackfills.get(model);
    if (targets === undefined || targets.length === 0) return;
    this.pendingBackfills.delete(model);
    await Promise.allSettled(targets.map((store) => store.write(environment, revision, model, ttlSeconds)));
  }

  async write(environment: string, revision: number, model: unknown, ttlSeconds: number): Promise<void> {
    await Promise.allSettled(this.stores.map((store) => store.write(environment, revision, model, ttlSeconds)));
  }

  async touch(environment: string, revision: number, ttlSeconds: number): Promise<void> {
    await Promise.allSettled(this.stores.map((store) => store.touch(environment, revision, ttlSeconds)));
  }
}
