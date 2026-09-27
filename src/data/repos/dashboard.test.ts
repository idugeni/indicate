import { describe, expect, it } from 'vitest';

import { insertChunks, sameJson, pruneAnalyticsLabels } from '@/data/repos/dashboard';

const EMPTY_INPUT = {
  siteLabelRows: Array.from({ length: 50 }, (_, index) => ({ id: `s-${index}`, name: `situs-${index}.example` })),
  categoryLabelRows: [{ id: 'k-1', name: 'Umum' }],
  publisherLabelRows: Array.from({ length: 20 }, (_, index) => ({ id: `p-${index}`, name: `Penerbit ${index}` })),
  regionLabelRows: [{ id: 'w-1', name: 'Jawa Tengah' }],
  siteViewRows: [],
  articleViewRows: [],
  bySite: [],
  byCategory: [],
  byPublisher: [],
  byRegion: [],
  outcomesBySite: [],
  jobDimensions: [],
  outcomeDimensions: [],
  publisherFlows: [],
};

describe('Pemangkasan label analitik', () => {
  it('membuang seluruh label saat tidak ada koleksi yang merujuk', () => {
    const labels = pruneAnalyticsLabels(EMPTY_INPUT);
    expect(labels.siteLabels).toEqual({});
    expect(labels.categoryLabels).toEqual({});
    expect(labels.publisherLabels).toEqual({});
    expect(labels.regionLabels).toEqual({});
    expect(labels.articleLabels).toEqual({});
  });

  it('menyimpan hanya id yang dirujuk kanal artikel', () => {
    const labels = pruneAnalyticsLabels({ ...EMPTY_INPUT, bySite: [{ key: 's-7' }, { key: 's-3' }] });
    expect(labels.siteLabels).toEqual({ 's-7': 'situs-7.example', 's-3': 'situs-3.example' });
  });

  it('memetakan id situs dan wilayah dari kunci majemuk serta dimensi', () => {
    const labels = pruneAnalyticsLabels({
      ...EMPTY_INPUT,
      byRegion: [{ key: 'w-1' }],
      outcomesBySite: [{ key: 's-11:published' }],
      jobDimensions: [{ siteId: 's-2', regionId: 'w-9' }],
      outcomeDimensions: [{ siteId: 's-4', regionId: null }],
    });
    expect(Object.keys(labels.siteLabels).sort()).toEqual(['s-11', 's-2', 's-4']);
    expect(labels.regionLabels).toEqual({ 'w-1': 'Jawa Tengah' });
  });

  it('memetakan penerbit dari grafik alur dan dari dimensi artikel', () => {
    const labels = pruneAnalyticsLabels({
      ...EMPTY_INPUT,
      byPublisher: [{ key: 'p-5' }],
      publisherFlows: [{ penerbit: 'p-9', situs: 's-6' }],
    });
    expect(labels.publisherLabels).toEqual({ 'p-5': 'Penerbit 5', 'p-9': 'Penerbit 9' });
    expect(labels.siteLabels).toEqual({ 's-6': 'situs-6.example' });
  });

  it('menyertakan nama situs dari baris tayangan sebagai cadangan', () => {
    const labels = pruneAnalyticsLabels({
      ...EMPTY_INPUT,
      siteLabelRows: [],
      siteViewRows: [{ id: 's-8', name: 'situs-8.example' }],
    });
    expect(labels.siteLabels).toEqual({ 's-8': 'situs-8.example' });
  });
});

describe('Pemotongan sisipan massal', () => {
  it('tidak menghasilkan pernyataan untuk koleksi kosong', () => {
    expect([...insertChunks([])]).toEqual([]);
  });

  it('mempertahankan seluruh baris dan urutannya', () => {
    const rows = Array.from({ length: 134 }, (_, index) => ({ id: `a-${index}` }));
    const flat = [...insertChunks(rows)].flat();
    expect(flat).toHaveLength(134);
    expect(flat.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });

  it('memecah menjadi beberapa pernyataan untuk koleksi besar', () => {
    const rows = Array.from({ length: 250 }, (_, index) => ({ id: `a-${index}` }));
    const chunks = [...insertChunks(rows)];
    expect(chunks.length).toBe(2);
    expect(chunks[0]).toHaveLength(200);
    expect(chunks[1]).toHaveLength(50);
  });
});

describe('Perbandingan nilai untuk diff tenant', () => {
  it('membandingkan nilai JSON secara struktural', () => {
    expect(sameJson([{ label: 'a', path: '/a' }], [{ label: 'a', path: '/a' }])).toBe(true);
    expect(sameJson([{ label: 'a', path: '/a' }], [{ label: 'b', path: '/a' }])).toBe(false);
    expect(sameJson(null, undefined)).toBe(false);
  });
});
