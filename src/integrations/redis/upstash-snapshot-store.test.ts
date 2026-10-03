import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const set = vi.fn();
const expire = vi.fn();
const del = vi.fn();
const mget = vi.fn();

vi.mock('@upstash/redis', () => ({
  Redis: class {
    get = get;
    set = set;
    expire = expire;
    del = del;
    mget = mget;
  },
}));

const { UpstashSnapshotStore } = await import('@/integrations/redis/upstash-snapshot-store');

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
      sites: Array.from({ length: 200 }, (_, index) => ({
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
    const big = { rows: Array.from({ length: 200 }, (_, index) => `baris-panjang-berulang-${index}`) };
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
      sites: Array.from({ length: 200 }, (_, index) => ({
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
});
