import { describe, expect, it } from 'vitest';

import { reconcileMediaObjectKeys, type MediaObjectKeyRow } from '@/modules/publishing/media-reconciliation';
import type { StoredObjectRef } from '@/integrations/storage/ports';

const NOW = new Date('2026-09-28T06:12:00.000Z');

function row(overrides: Partial<MediaObjectKeyRow> & { mediaId: string; objectKey: string }): MediaObjectKeyRow {
  return {
    organizationId: 'o1',
    thumbObjectKey: null,
    purpose: 'site-logo',
    state: 'active',
    ...overrides,
  };
}

function stored(overrides: Partial<StoredObjectRef> & { key: string }): StoredObjectRef {
  return {
    bucket: 'private',
    contentLength: 100,
    etag: 'etag',
    visibility: 'private',
    ...overrides,
  };
}

function storage(objects: readonly StoredObjectRef[]) {
  return { listObjects: async () => objects };
}

describe('reconcileMediaObjectKeys', () => {
  it('melaporkan objek tanpa baris media', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([stored({ key: 'o/o1/p/site-logo/y=2026/a.png' }), stored({ key: 'o/o1/p/site-logo/y=2026/b.png', contentLength: 40 })]),
      async () => [row({ mediaId: 'm1', objectKey: 'o/o1/p/site-logo/y=2026/a.png' })],
      () => NOW,
    );
    expect(report.drift).toEqual([{
      kind: 'object_without_row',
      objectKey: 'o/o1/p/site-logo/y=2026/b.png',
      organizationId: null,
      mediaId: null,
      purpose: null,
      state: null,
      contentLength: 40,
    }]);
  });

  it('melaporkan baris media tanpa objek', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([]),
      async () => [row({ mediaId: 'm1', objectKey: 'o/o1/p/site-logo/y=2026/a.png' })],
      () => NOW,
    );
    expect(report.drift).toHaveLength(1);
    expect(report.drift[0]).toMatchObject({ kind: 'row_without_object', mediaId: 'm1', contentLength: 0 });
  });

  it('melaporkan thumb yang hilang terpisah dari key utama', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([stored({ key: 'o/o1/p/site-logo/y=2026/a.png' })]),
      async () => [row({ mediaId: 'm1', objectKey: 'o/o1/p/site-logo/y=2026/a.png', thumbObjectKey: 'o/o1/p/site-logo/y=2026/a-thumb.png' })],
      () => NOW,
    );
    expect(report.drift.map((entry) => entry.kind)).toEqual(['thumb_without_object']);
  });

  it('menandai object pub/ yang berada di bucket privat', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([stored({ key: 'pub/o/o1/p/article-cover/y=2026/a.avif' })]),
      async () => [row({ mediaId: 'm1', objectKey: 'pub/o/o1/p/article-cover/y=2026/a.avif', purpose: 'article-cover' })],
      () => NOW,
    );
    expect(report.drift.map((entry) => entry.kind)).toEqual(['object_in_wrong_bucket']);
  });

  it('menerima kunci privat di bucket privat dan kunci pub di bucket publik', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([
        stored({ key: 'o/o1/p/site-logo/y=2026/a.png' }),
        stored({ key: 'pub/o/o1/p/article-cover/y=2026/a.avif', bucket: 'public', visibility: 'public' }),
      ]),
      async () => [
        row({ mediaId: 'm1', objectKey: 'o/o1/p/site-logo/y=2026/a.png' }),
        row({ mediaId: 'm2', objectKey: 'pub/o/o1/p/article-cover/y=2026/a.avif', purpose: 'article-cover' }),
      ],
      () => NOW,
    );
    expect(report.drift).toEqual([]);
    expect(report.storedObjects).toBe(2);
    expect(report.storedBytes).toBe(200);
    expect(report.trackedKeys).toBe(2);
  });

  it('tidak melaporkan row archived yang objeknya sudah dipurge', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([]),
      async () => [row({ mediaId: 'm1', objectKey: 'o/o1/p/site-logo/y=2026/a.png', state: 'archived' })],
      () => NOW,
    );
    expect(report.drift).toEqual([]);
  });

  it('membatasi jumlah drift yang dilaporkan tanpa kehilangan hitungan kelas', async () => {
    const objects = Array.from({ length: 10 }, (slot, index) => stored({ key: `o/o1/p/site-logo/y=2026/${index}.png` }));
    const report = await reconcileMediaObjectKeys(storage(objects), async () => [], () => NOW, { maxReportedDrift: 3 });
    expect(report.drift).toHaveLength(3);
    expect(report.storedObjects).toBe(10);
  });

  it('tidak melapor dua kali untuk kelas drift yang sama pada kunci yang sama', async () => {
    const report = await reconcileMediaObjectKeys(
      storage([stored({ key: 'orphan.png' })]),
      async () => [row({ mediaId: 'm1', objectKey: 'orphan.png' })],
      () => NOW,
    );
    expect(report.drift).toEqual([]);
  });
});
