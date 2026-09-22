import { describe, expect, it } from 'vitest';

import {
  createSuggestionCache,
  filterLabeledOptions,
  normalizeQuery,
  rankTags,
} from '@/modules/dashboard/components/shared/suggestion-cache';

const OPTIONS = [
  { value: 'r-1', label: 'Wonosobo' },
  { value: 'r-2', label: 'Semarang' },
  { value: 'c-1', label: 'Politik' },
];

describe('normalizeQuery', () => {
  it('memangkas dan mengecilkan huruf', () => {
    expect(normalizeQuery('  WoNo ')).toBe('wono');
  });
});

describe('filterLabeledOptions', () => {
  it('mencocokkan substring label tanpa peduli kapital', () => {
    expect(filterLabeledOptions(OPTIONS, 'wono').map((o) => o.value)).toEqual(['r-1']);
    expect(filterLabeledOptions(OPTIONS, '').map((o) => o.value)).toEqual(['r-1', 'r-2', 'c-1']);
  });

  it('jatuh ke value saat label tak cocok dan membatasi hasil', () => {
    expect(filterLabeledOptions(OPTIONS, 'c-1').map((o) => o.value)).toEqual(['c-1']);
    expect(filterLabeledOptions(OPTIONS, '', 2)).toHaveLength(2);
  });
});

describe('rankTags', () => {
  it('mengurutkan tag terbanyak dulu lalu alfabet', () => {
    const ranked = rankTags([
      { tags: ['b', 'a'] },
      { tags: ['b', 'c'] },
      { tags: null },
      {},
    ]);
    expect(ranked).toEqual(['b', 'a', 'c']);
  });
});

describe('createSuggestionCache', () => {
  it('menghitung sekali per kunci dan menggusur yang terlama', () => {
    let calls = 0;
    const cache = createSuggestionCache<string>(2);
    const compute = () => `v${(calls += 1)}`;
    expect(cache.get('a', compute)).toBe('v1');
    expect(cache.get('a', compute)).toBe('v1');
    expect(cache.size).toBe(1);
    cache.get('b', compute);
    cache.get('c', compute);
    expect(cache.size).toBe(2);
    expect(cache.get('a', compute)).toBe('v4');
  });
});
