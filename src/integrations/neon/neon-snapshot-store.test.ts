import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NeonSnapshotStore, type NeonSnapshotExecutor } from '@/integrations/neon/neon-snapshot-store';

const calls: { text: string; values: readonly unknown[] }[] = [];
let rows: readonly Record<string, unknown>[] = [];
let fail = false;

const executor: NeonSnapshotExecutor = async (strings, ...values) => {
  calls.push({ text: strings.join('?'), values });
  if (fail) throw new Error('neon_unavailable');
  return rows;
};

const query = vi.fn(executor);

function store() {
  return new NeonSnapshotStore(query);
}

describe('NeonSnapshotStore snapshot terkompresi', () => {
  beforeEach(() => {
    calls.length = 0;
    rows = [];
    fail = false;
    query.mockReset();
    query.mockImplementation(executor);
  });

  it('write menyimpan upsert gzip lalu menghapus revisi lama', async () => {
    const model = {
      environment: 'test',
      configurationVersion: 7,
      sites: Array.from({ length: 200 }, (slot, index) => ({
        siteId: `site-${index}-berita-example-indicate-website`,
        hostname: `kota-${index}.berita.example`,
      })),
    };
    await store().write('test', 7, model, 3600);
    expect(query).toHaveBeenCalledTimes(2);
    const [upsert, janitor] = calls;
    expect(upsert?.text).toContain('INSERT INTO neon_runtime_snapshots');
    expect(upsert?.values.some((value) => typeof value === 'string' && value.startsWith('gzip:'))).toBe(true);
    expect(janitor?.text).toContain('DELETE FROM neon_runtime_snapshots');
    expect(janitor?.values).toEqual(['test', 7]);
  });

  it('write tidak melempar saat neon gagal', async () => {
    fail = true;
    await expect(store().write('test', 7, { a: 1 }, 3600)).resolves.toBeUndefined();
  });

  it('read mengembalikan model yang sama', async () => {
    const model = { environment: 'test', configurationVersion: 7 };
    await store().write('test', 7, model, 3600);
    const stored = calls[0]?.values.find((value) => typeof value === 'string' && value.startsWith('gzip:'));
    rows = [{ blob: stored ?? null }];
    expect(await store().read('test', 7)).toEqual(model);
  });

  it('read menerima warisan JSON polos tanpa prefix', async () => {
    const model = { environment: 'test', configurationVersion: 7 };
    rows = [{ blob: JSON.stringify(model) }];
    expect(await store().read('test', 7)).toEqual(model);
  });

  it('read mengembalikan null saat baris tidak ada, blob rusak, atau neon gagal', async () => {
    rows = [];
    expect(await store().read('test', 7)).toBeNull();
    rows = [{ blob: 'gzip:!!!bukan-base64!!!' }];
    expect(await store().read('test', 7)).toBeNull();
    fail = true;
    expect(await store().read('test', 7)).toBeNull();
  });

  it('touch memperbarui updated_at tanpa melempar', async () => {
    await store().touch('test', 7, 3600);
    expect(query).toHaveBeenCalledOnce();
    expect(calls[0]?.text).toContain('UPDATE neon_runtime_snapshots');
    fail = true;
    await expect(store().touch('test', 7, 3600)).resolves.toBeUndefined();
  });
});
