import { describe, expect, it } from 'vitest';

import { makeNetworkArticle } from '@/modules/delivery/network-test-fixtures';
import { selectArticleSidebar } from '@/modules/site/components/network/ui/article-sidebar-data';

describe('selectArticleSidebar', () => {
  it('mempartisi baca-juga, terpopuler, dan terbaru tanpa duplikat', () => {
    const current = makeNetworkArticle({ id: 'aktif', slug: 'aktif' });
    const sameCategory = [1, 2, 3, 4].map((n) =>
      makeNetworkArticle({ id: `terkait-${n}`, slug: `terkait-${n}`, categorySlug: 'politik', categoryName: 'Politik', viewCount: n }),
    );
    const popular = makeNetworkArticle({ id: 'populer', slug: 'populer', viewCount: 9999 });
    const fresh = makeNetworkArticle({ id: 'segar', slug: 'segar', publishedAt: '2026-10-04T00:00:00.000Z', viewCount: 1 });
    const articles = [current, ...sameCategory, popular, fresh];

    const sidebar = selectArticleSidebar(articles, current.id, sameCategory);

    expect(sidebar.bacaJuga.map((item) => item.slug)).toEqual(sameCategory.map((item) => item.slug));
    expect(sidebar.terpopuler.map((item) => item.slug)).toContain('populer');
    const ids = new Set([...sidebar.bacaJuga, ...sidebar.terpopuler, ...sidebar.terbaru].map((item) => item.id));
    expect(ids.has(current.id)).toBe(false);
    expect(ids.size).toBe(sidebar.bacaJuga.length + sidebar.terpopuler.length + sidebar.terbaru.length);
  });

  it('mengagregat topik dan kanal teratas', () => {
    const current = makeNetworkArticle({ id: 'aktif-2', slug: 'aktif', tags: [] });
    const first = makeNetworkArticle({ id: 'satu', slug: 'satu', tags: ['politik', 'hukum'], categorySlug: 'politik', categoryName: 'Politik' });
    const second = makeNetworkArticle({ id: 'dua', slug: 'dua', tags: ['politik'], categorySlug: 'politik', categoryName: 'Politik' });
    const sidebar = selectArticleSidebar([current, first, second], current.id, []);

    expect(sidebar.topics[0]).toMatchObject({ tag: 'politik', count: 2 });
    expect(sidebar.channels[0]).toMatchObject({ slug: 'politik', count: 2 });
  });
});
