import { afterEach, describe, expect, it, vi } from 'vitest';

import { exportDailyAudit } from '@/modules/audit/audit-worm-export';

const NOW = new Date('2026-09-19T10:00:00.000Z');
const DAY = '2026-09-18';

afterEach(() => {
  vi.unstubAllGlobals();
});

function harness(options: { readonly rowsPerTable?: number; readonly existing?: readonly string[]; readonly fetchStatus?: number } = {}) {
  const puts = new Map<string, Uint8Array>();
  const dbRows = Array.from({ length: options.rowsPerTable ?? 0 }, (_, index) => ({ audit_worm_fetch: { id: index + 1 } }));
  const db = { execute: vi.fn(async () => dbRows) };
  const storage = {
    headExact: vi.fn(async (key: string) => ((options.existing ?? []).includes(key) ? { contentLength: 1 } : null)),
    putExact: vi.fn(async (key: string, bytes: Uint8Array) => {
      puts.set(key, bytes);
    }),
    authorizeExactGet: vi.fn(async (key: string) => ({ url: `https://cdn.example/${key}`, headers: {} })),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const status = options.fetchStatus ?? 200;
      if (status !== 200) return new Response('err', { status });
      const key = String(url).replace('https://cdn.example/', '');
      const bytes = key.endsWith('audit_logs.jsonl') && puts.get(key) === undefined ? new Uint8Array() : puts.get(key);
      if (bytes === undefined) return new Response('missing', { status: 500 });
      return new Response(bytes as unknown as BodyInit);
    }),
  );
  return { db, storage, puts };
}

describe('exportDailyAudit', () => {
  it('mengekspor hari kemarin kosong beserta manifes terverifikasi', async () => {
    const { db, storage } = harness();
    const summary = await exportDailyAudit({ db: db as never, storage: storage as never, now: NOW });
    expect(summary.date).toBe(DAY);
    expect(summary.rows).toBe(0);
    expect(summary.verified).toBe(true);
    expect(summary.files).toHaveLength(4);
    expect(summary.files.map(({ key }) => key)).toEqual([
      `worm/${DAY}/audit_logs.jsonl`,
      `worm/${DAY}/runtime_config_audit_logs.jsonl`,
      `worm/${DAY}/retention_runs.jsonl`,
      `worm/${DAY}/manifest.json`,
    ]);
    expect(storage.putExact).toHaveBeenCalledTimes(4);
    expect(db.execute).toHaveBeenCalledTimes(4);
  });

  it('menghitung baris lintas tabel', async () => {
    const { db, storage } = harness({ rowsPerTable: 2 });
    const summary = await exportDailyAudit({ db: db as never, storage: storage as never, now: NOW });
    expect(summary.rows).toBe(6);
    expect(db.execute).toHaveBeenCalledTimes(4);
  });

  it('melewati berkas yang sudah ada tanpa tulis ulang', async () => {
    const existing = `worm/${DAY}/audit_logs.jsonl`;
    const { db, storage } = harness({ existing: [existing] });
    const summary = await exportDailyAudit({ db: db as never, storage: storage as never, now: NOW });
    expect(summary.verified).toBe(true);
    const putKeys = storage.putExact.mock.calls.map((call) => call[0]);
    expect(putKeys).not.toContain(existing);
    expect(putKeys).toHaveLength(3);
  });

  it('gagal saat verifikasi baca-balik rusak', async () => {
    const { db, storage } = harness({ fetchStatus: 500 });
    await expect(exportDailyAudit({ db: db as never, storage: storage as never, now: NOW })).rejects.toThrow('WORM verify failed');
  });
});
