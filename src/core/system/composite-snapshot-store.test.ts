import { describe, expect, it } from 'vitest';

import { CompositeSnapshotStore } from '@/core/system/composite-snapshot-store';
import type { SnapshotSharedStore } from '@/core/system/runtime-config-snapshot-cache';

function fakeStore(impl: Partial<SnapshotSharedStore> & { name: string }): SnapshotSharedStore & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    read: impl.read ?? (async () => null),
    write: impl.write ?? (async () => {
      calls.push(`${impl.name}:write`);
    }),
    touch: impl.touch ?? (async () => {
      calls.push(`${impl.name}:touch`);
    }),
  };
}

describe('CompositeSnapshotStore fanout', () => {
  it('read jatuh ke lapis berikut saat lapis awal miss atau gagal', async () => {
    const first = fakeStore({ name: 'first', read: async () => null });
    const broken = fakeStore({
      name: 'broken',
      read: async () => {
        throw new Error('lapis_rusak');
      },
    });
    const last = fakeStore({ name: 'last', read: async () => ({ revision: 9 }) });
    const composite = new CompositeSnapshotStore([first, broken, last]);
    expect(await composite.read('production', 9)).toEqual({ revision: 9 });
    const empty = new CompositeSnapshotStore([first, broken]);
    expect(await empty.read('production', 9)).toBeNull();
  });

  it('write dan touch mencapai semua lapis secara best-effort', async () => {
    const rejecting = fakeStore({
      name: 'rejecting',
      write: async () => {
        throw new Error('tulis_gagal');
      },
      touch: async () => {
        throw new Error('sentuh_gagal');
      },
    });
    const ok = fakeStore({ name: 'ok' });
    const composite = new CompositeSnapshotStore([rejecting, ok]);
    await expect(composite.write('production', 9, { revision: 9 }, 3600)).resolves.toBeUndefined();
    await expect(composite.touch('production', 9, 3600)).resolves.toBeUndefined();
    expect(ok.calls).toEqual(['ok:write', 'ok:touch']);
  });

  it('meneruskan argumen yang sama ke setiap lapis', async () => {
    const seen: unknown[][] = [];
    const recorder = (label: string): SnapshotSharedStore => ({
      read: async (...args: unknown[]) => {
        seen.push([label, 'read', ...args]);
        return null;
      },
      write: async (...args: unknown[]) => {
        seen.push([label, 'write', ...args]);
      },
      touch: async (...args: unknown[]) => {
        seen.push([label, 'touch', ...args]);
      },
    });
    const composite = new CompositeSnapshotStore([recorder('a'), recorder('b')]);
    await composite.write('production', 9, { revision: 9 }, 3600);
    await composite.touch('production', 9, 3600);
    expect(seen).toEqual([
      ['a', 'write', 'production', 9, { revision: 9 }, 3600],
      ['b', 'write', 'production', 9, { revision: 9 }, 3600],
      ['a', 'touch', 'production', 9, 3600],
      ['b', 'touch', 'production', 9, 3600],
    ]);
  });
});
