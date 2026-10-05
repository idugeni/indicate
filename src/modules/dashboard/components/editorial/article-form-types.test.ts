import { describe, expect, it } from 'vitest';

import { collectInlineMediaIds, findForeignMediaIds } from '@/modules/dashboard/components/editorial/article-form-types';

describe('collectInlineMediaIds', () => {
  it('mengekstrak id media unik dari node gambar', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Halo' }] },
        { type: 'image', attrs: { src: '/api/network/media/3a86c437-885f-41e1-b1e0-d1a5f5816fbc', alt: 'a' } },
        { type: 'image', attrs: { src: '/api/network/media/3a86c437-885f-41e1-b1e0-d1a5f5816fbc', alt: 'duplikat' } },
        { type: 'image', attrs: { src: 'https://cdn.example/luar.jpg', alt: 'luar' } },
      ],
    };
    expect(collectInlineMediaIds(doc)).toEqual(['3a86c437-885f-41e1-b1e0-d1a5f5816fbc']);
  });

  it('kosong untuk draf tanpa gambar tersimpan', () => {
    expect(collectInlineMediaIds(null)).toEqual([]);
    expect(collectInlineMediaIds({ type: 'doc', content: [] })).toEqual([]);
  });

  it('mengekstrak id media dari node galeri inline', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'imageGallery',
          attrs: {
            images: [
              { src: '/api/network/media/3a86c437-885f-41e1-b1e0-d1a5f5816fbc', alt: '' },
              { src: '/api/network/media/7b1a2c3d-4e5f-6071-8293-a4b5c6d7e8f9', alt: '' },
              { src: 'blob:pratinjau', alt: '' },
            ],
          },
        },
      ],
    };
    expect(collectInlineMediaIds(doc)).toEqual([
      '3a86c437-885f-41e1-b1e0-d1a5f5816fbc',
      '7b1a2c3d-4e5f-6071-8293-a4b5c6d7e8f9',
    ]);
  });
});

describe('findForeignMediaIds', () => {
  it('menandai media yang pemiliknya beda dari org artikel', () => {
    expect(
      findForeignMediaIds(['a', 'b', 'c'], { a: 'org-1', b: 'org-2', c: null }, 'org-1'),
    ).toEqual(['b']);
  });

  it('diam saat org artikel belum tentu', () => {
    expect(findForeignMediaIds(['a'], { a: 'org-2' }, '')).toEqual([]);
  });
});
