import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const set = vi.fn();
const expire = vi.fn();
const del = vi.fn();
const mget = vi.fn();
const logEvent = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = get;
    set = set;
    expire = expire;
    del = del;
    mget = mget;
  },
}));

vi.mock('@/core/observability/logger', () => ({
  logEvent,
}));

const recordOperation = vi.fn();

vi.mock('@/core/observability/operation-metrics', () => ({
  recordOperation,
}));

const { SNAPSHOT_WIRE_WARN_BYTES, UpstashSnapshotStore, snapshotWireSizeOf } = await import(
  '@/integrations/redis/upstash-snapshot-store'
);

function store() {
  return new UpstashSnapshotStore({ url: 'https://redis.test', token: 'token', namespace: 'prod' });
}

describe('UpstashSnapshotStore cache-aside', () => {
  beforeEach(() => {
    get.mockReset();
    set.mockReset();
    mget.mockReset();
  });

  it('writeKey menyimpan JSON polos untuk nilai kecil', async () => {
    const model = { activeDomains: 3, activeSites: 10 };
    await store().writeKey('snapshot:kecil', model, 180);
    const [, stored, options] = set.mock.calls[0] as [string, string, { ex: number }];
    expect(stored).toBe(JSON.stringify(model));
    expect(options).toEqual({ ex: 180 });

    get.mockResolvedValueOnce(stored);
    expect(await store().readKey('snapshot:kecil')).toEqual(model);
  });

  it('writeKey mengompresi nilai besar dan readKey mendekodenya', async () => {
    const model = {
      sites: Array.from({ length: 200 }, (slot, index) => ({
        siteId: `site-${index}-berita-example-indicate-website`,
        hostname: `kota-${index}.berita.example`,
      })),
    };
    await store().writeKey('snapshot:besar', model, 180);
    const [, stored] = set.mock.calls[0] as [string, string];
    expect(stored.startsWith('gzip:')).toBe(true);
    expect(stored.length).toBeLessThan(JSON.stringify(model).length);

    get.mockResolvedValueOnce(stored);
    expect(await store().readKey('snapshot:besar')).toEqual(model);
  });

  it('readMany mendekode campuran polos, gzip, dan miss', async () => {
    const small = { activeSites: 1 };
    const big = { rows: Array.from({ length: 200 }, (slot, index) => `baris-panjang-berulang-${index}`) };
    await store().writeKey('kecil', small, 180);
    await store().writeKey('besar', big, 180);
    const [, storedSmall] = set.mock.calls[0] as [string, string];
    const [, storedBig] = set.mock.calls[1] as [string, string];
    mget.mockResolvedValueOnce([storedSmall, storedBig, null]);
    expect(await store().readMany(['kecil', 'besar', 'hilang'])).toEqual([small, big, null]);
  });
});

describe('UpstashSnapshotStore snapshot terkompresi', () => {
  beforeEach(() => {
    get.mockReset();
    set.mockReset();
  });

  it('write menyimpan gzip dan read mengembalikan model yang sama', async () => {
    const model = {
      environment: 'test',
      configurationVersion: 7,
      sites: Array.from({ length: 200 }, (slot, index) => ({
        siteId: `site-${index}-berita-example-indicate-website`,
        hostname: `kota-${index}.berita.example`,
        locale: 'id-ID',
      })),
    };
    await store().write('test', 7, model, 3600);
    expect(set).toHaveBeenCalledOnce();
    const [key, stored, options] = set.mock.calls[0] as [string, string, { ex: number }];
    expect(key).toBe('prod:snapshot:test:v7');
    expect(stored.startsWith('gzip:')).toBe(true);
    expect(options).toEqual({ ex: 3600 });
    expect(stored.length).toBeLessThan(JSON.stringify(model).length);

    get.mockResolvedValueOnce(stored);
    expect(await store().read('test', 7)).toEqual(model);
  });

  it('read menerima warisan JSON polos tanpa prefix', async () => {
    const model = { environment: 'test', configurationVersion: 7 };
    get.mockResolvedValueOnce(JSON.stringify(model));
    expect(await store().read('test', 7)).toEqual(model);
  });

  it('read mengembalikan null saat blob rusak', async () => {
    get.mockResolvedValueOnce('gzip:!!!bukan-base64!!!');
    expect(await store().read('test', 7)).toBeNull();
  });

  it('read mengembalikan null saat redis gagal', async () => {
    get.mockRejectedValueOnce(new Error('redis_unavailable'));
    expect(await store().read('test', 7)).toBeNull();
  });

  it('kegagalan baca/tulis/hapus tercatat 500 tanpa mengubah fail-open', async () => {
    recordOperation.mockReset();
    get.mockRejectedValueOnce(new Error('redis down'));
    await expect(store().readKey('k')).resolves.toBeNull();
    set.mockRejectedValueOnce(new Error('redis down'));
    await expect(store().writeKey('k', { a: 1 }, 60)).resolves.toBeUndefined();
    del.mockRejectedValueOnce(new Error('redis down'));
    await expect(store().deleteKey('k')).resolves.toBeUndefined();
    const samples = recordOperation.mock.calls.map((call) => call[0] as Record<string, unknown>);
    expect(samples).toHaveLength(3);
    for (const sample of samples) expect(sample.status).toBe(500);
    expect(samples.map((sample) => sample.operation)).toEqual(['redis.get', 'redis.set', 'redis.del']);
  });

  it('mget menghitung hit/miss per kunci, bukan satu bendera', async () => {
    recordOperation.mockReset();
    mget.mockResolvedValueOnce(['{"a":1}', null, '{"b":2}']);
    await store().readMany(['k1', 'k2', 'k3']);
    const sample = recordOperation.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(sample).toMatchObject({ operation: 'redis.mget', cacheHit: 2, cacheMiss: 1 });
  });
});

describe('UpstashSnapshotStore perlindungan ukuran', () => {
  beforeEach(() => {
    set.mockReset();
    logEvent.mockReset();
  });

  it('threshold memberi headroom ~7x dari ukuran armada (~73 KiB wire)', () => {
    expect(SNAPSHOT_WIRE_WARN_BYTES).toBe(512 * 1024);
    expect(snapshotWireSizeOf('gzip:')).toBeGreaterThan(0);
  });

  it('write normal di bawah threshold tidak me-log warning', async () => {
    const model = { environment: 'test', configurationVersion: 7, sites: [{ siteId: 's-1' }] };
    await store().write('test', 7, model, 3600);
    expect(set).toHaveBeenCalledOnce();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('write raksasa tetap sukses (best-effort) tetapi me-log warning oversize', async () => {
    // Payload deterministik berentropi tinggi agar wire size melewati threshold.
    let seed = 0x9e3779b9;
    const nextHex = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0).toString(16).padStart(8, '0');
    };
    const blob = Array.from({ length: 40_000 }, () => `${nextHex()}${nextHex()}${nextHex()}`).join('');
    await store().write('test', 8, { blob }, 3600);
    expect(set).toHaveBeenCalledOnce();
    const [, stored] = set.mock.calls[0] as [string, string];
    expect(snapshotWireSizeOf(stored)).toBeGreaterThan(SNAPSHOT_WIRE_WARN_BYTES);
    expect(logEvent).toHaveBeenCalledOnce();
    const [level, fields] = logEvent.mock.calls[0] as [string, { event: string; context: Record<string, unknown> }];
    expect(level).toBe('warn');
    expect(fields.event).toBe('redis.snapshot.oversize');
    expect(fields.context.kind).toBe('snapshot');
    // Round-trip tetap utuh: proteksi tidak merusak kompresi/fallback.
    get.mockResolvedValueOnce(stored);
    expect(await store().read('test', 8)).toEqual({ blob });
  });

  it('writeKey raksasa me-log warning tanpa menggagalkan tulis', async () => {
    let seed = 0x85ebca6b;
    const nextHex = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0).toString(16).padStart(8, '0');
    };
    const blob = Array.from({ length: 40_000 }, () => `${nextHex()}${nextHex()}${nextHex()}`).join('');
    await store().writeKey('snapshot:raksasa', { blob }, 180);
    expect(set).toHaveBeenCalledOnce();
    expect(logEvent).toHaveBeenCalledOnce();
  });
});
