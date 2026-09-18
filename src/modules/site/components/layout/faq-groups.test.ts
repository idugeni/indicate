import { describe, expect, it } from 'vitest';

import { groupFaqItems, toFaqGridItems } from '@/modules/site/components/layout/content';

describe('toFaqGridItems', () => {
  it('memakai kategori NULL sebagai Umum', () => {
    const items = toFaqGridItems([{ id: 'a', question: 'Q', answer: 'A', category: null }]);
    expect(items[0]?.category).toBe('Umum');
  });

  it('merapikan spasi kategori', () => {
    const items = toFaqGridItems([{ id: 'a', question: 'Q', answer: 'A', category: '  Biaya  ' }]);
    expect(items[0]?.category).toBe('Biaya');
  });
});

describe('groupFaqItems', () => {
  it('mengelompok sesuai urutan kemunculan pertama', () => {
    const groups = groupFaqItems(
      toFaqGridItems([
        { id: 'a', question: 'Q1', answer: 'A1', category: 'Biaya' },
        { id: 'b', question: 'Q2', answer: 'A2', category: 'Akun' },
        { id: 'c', question: 'Q3', answer: 'A3', category: 'Biaya' },
      ]),
    );
    expect(groups.map((group) => group.category)).toEqual(['Biaya', 'Akun']);
    expect(groups[0]?.items.map((item) => item.id)).toEqual(['a', 'c']);
  });

  it('daftar kosong tanpa grup', () => {
    expect(groupFaqItems([])).toEqual([]);
  });
});
