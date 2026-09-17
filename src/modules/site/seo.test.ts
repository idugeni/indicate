import { describe, expect, it } from 'vitest';

import { makeNetworkArticle, makeNetworkSite } from '@/modules/delivery/network-test-fixtures';
import { serializeRss } from '@/modules/site/seo';

describe('serializeRss enclosure', () => {
  it('memakai tipe MIME media R2 bila diketahui', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({
        title: 'Judul berita utama',
        description: 'Deskripsi berita utama yang cukup panjang untuk kebutuhan tayang.',
        imageUrl: 'https://portal.example/api/network/media/img1',
        imageMediaType: 'image/webp',
      }),
    ]);
    expect(serializeRss(site)).toContain('type="image/webp"');
  });

  it('mempertahankan image/jpeg untuk hotlink eksternal', () => {
    const site = makeNetworkSite([
      makeNetworkArticle({
        title: 'Judul berita utama',
        description: 'Deskripsi berita utama yang cukup panjang untuk kebutuhan tayang.',
        imageUrl: 'https://images.unsplash.com/photo-123?auto=format&fit=crop&w=1200&q=80',
      }),
    ]);
    expect(serializeRss(site)).toContain('type="image/jpeg"');
  });
});
