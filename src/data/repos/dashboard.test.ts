import { describe, expect, it } from 'vitest';

import { insertChunks, sameJson } from '@/data/repos/dashboard';

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
