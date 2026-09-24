import { describe, expect, it } from 'vitest';

import { articleBodyText, parseArticleBody } from '@/modules/site/article-markup';

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

  it('merender penanda kurung lama apa adanya sebagai paragraf', () => {
    expect(parseArticleBody('[gambar:2]')).toHaveLength(1);
    expect(parseArticleBody('[gambar:2]')[0]).toMatchObject({ kind: 'paragraph' });
    expect(parseArticleBody('[youtube:dQw4w9WgXcQ]')[0]).toMatchObject({ kind: 'paragraph' });
  });

  it('mengenali heading, tautan aman, dan kutipan', () => {
    const blocks = parseArticleBody('## Judul Bagian\n\nLihat [sumber](https://contoh.id/a) dan [x](javascript:alert(1)).\n\n> Kata bijak\n> berlanjut');
    expect(blocks[0]).toMatchObject({ kind: 'heading', level: 2 });
    if (blocks[1]?.kind !== 'paragraph') throw new Error('expected paragraph');
    expect(blocks[1].segments).toContainEqual({ text: 'sumber', bold: false, italic: false, href: 'https://contoh.id/a' });
    expect(blocks[1].segments.some((segment) => segment.href !== undefined && segment.href.startsWith('javascript:'))).toBe(false);
    expect(blocks[2]).toMatchObject({ kind: 'quote' });
    const h3 = parseArticleBody('### Sub');
    expect(h3[0]).toMatchObject({ kind: 'heading', level: 3 });
  });

  it('melewati blok kosong dan sintaks tak dikenal apa adanya', () => {
    expect(parseArticleBody('\n\n   \n\n')).toEqual([]);
    const blocks = parseArticleBody('[bukan-gambar]');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: 'paragraph' });
  });
});

describe('articleBodyText', () => {
  it('mereduksi markup menjadi teks polos', () => {
    expect(articleBodyText('Halo **dunia**.\n\n- a\n- b')).toBe('Halo dunia. a b');
    expect(articleBodyText('## Judul\n\n> kutip')).toBe('Judul kutip');
    expect(articleBodyText('')).toBe('');
  });
});
