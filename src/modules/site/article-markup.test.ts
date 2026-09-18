import { describe, expect, it } from 'vitest';

import { articleBodyText, FIGURE_MARKER_PATTERN, parseArticleBody } from '@/modules/site/article-markup';

describe('parseArticleBody', () => {
  it('memecah paragraf, format inline, dan daftar', () => {
    const blocks = parseArticleBody('Halo **dunia** dan *redaksi*.\n\n- satu\n- dua');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'paragraph' });
    if (blocks[0]?.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(blocks[0].segments).toContainEqual({ text: 'dunia', bold: true, italic: false });
    expect(blocks[0].segments).toContainEqual({ text: 'redaksi', bold: false, italic: true });
    expect(blocks[1]).toMatchObject({ kind: 'list' });
  });

  it('mengenali penanda gambar sebaris sendiri', () => {
    expect(parseArticleBody('[gambar:2]')).toEqual([{ kind: 'figure', index: 2 }]);
    expect(parseArticleBody('[gambar:0]')).toHaveLength(1);
    expect(parseArticleBody('[gambar:0]')[0]).toMatchObject({ kind: 'paragraph' });
  });

  it('melewati blok kosong dan sintaks tak dikenal apa adanya', () => {
    expect(parseArticleBody('\n\n   \n\n')).toEqual([]);
    const blocks = parseArticleBody('[bukan-gambar]');
    expect(blocks).toHaveLength(1);
    expect(FIGURE_MARKER_PATTERN.test('[gambar:12]')).toBe(true);
  });
});

describe('articleBodyText', () => {
  it('mereduksi markup menjadi teks polos tanpa gambar', () => {
    expect(articleBodyText('Halo **dunia**.\n\n[gambar:1]\n\n- a\n- b')).toBe('Halo dunia. a b');
    expect(articleBodyText('')).toBe('');
  });
});
