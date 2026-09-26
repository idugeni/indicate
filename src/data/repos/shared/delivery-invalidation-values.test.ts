import { describe, expect, it } from 'vitest';

import { completeInvalidationValues } from '@/data/repos/shared/delivery-invalidation-values';

const ARTICLE_CORPUS_PATHS = ['/', '/llms.txt', '/news-sitemap.xml', '/rss.xml', '/sitemap.xml', '/tenant-home', '/tentang'];
const SITE_ONLY_PATHS = ['/apple-touch-icon.png', '/icon.png', '/kebijakan-privasi', '/kontak', '/logo.png', '/manifest.webmanifest', '/report', '/robots.txt', '/search', '/syarat-ketentuan'];

function pathsFor(reason: string, articleSlugs: readonly string[] = [], categorySlugs: readonly string[] = []): readonly string[] {
  return completeInvalidationValues({ organizationId: 'org-1', siteId: 'site-1', currentHostname: 'tenant.example', reason, articleSlugs, categorySlugs }).paths;
}

describe('completeInvalidationValues', () => {
  it('mempersist hanya path yang memuat artikel untuk reason korpus artikel', () => {
    expect(pathsFor('publication.published')).toEqual(ARTICLE_CORPUS_PATHS);
  });

  it('membawa path situs penuh untuk reason non-artikel', () => {
    const paths = pathsFor('site_settings.changed');
    expect(paths).toEqual(expect.arrayContaining([...ARTICLE_CORPUS_PATHS, ...SITE_ONLY_PATHS]));
    expect(paths).toHaveLength(ARTICLE_CORPUS_PATHS.length + SITE_ONLY_PATHS.length);
  });

  it('menyempitkan hanya bila seluruh reason agregat adalah reason korpus artikel', () => {
    expect(pathsFor('article.changed,category.changed')).toEqual(ARTICLE_CORPUS_PATHS);
  });

  it('melebar ke path penuh saat satu reason agregat bukan korpus artikel', () => {
    expect(pathsFor('article.changed,site_settings.changed')).toContain('/kebijakan-privasi');
  });

  it('melebar ke path penuh untuk reason yang tidak dikenal', () => {
    expect(pathsFor('publication.teleported')).toContain('/icon.png');
  });

  it('melebar ke path penuh untuk reason kosong', () => {
    expect(pathsFor('')).toContain('/icon.png');
  });

  it('memakai path penuh untuk metadata media yang bisa berupa logo atau gambar utama', () => {
    expect(pathsFor('media.metadata.updated')).toEqual(expect.arrayContaining(SITE_ONLY_PATHS));
  });

  it('memakai path penuh untuk purge manual', () => {
    expect(pathsFor('manual-purge')).toEqual(expect.arrayContaining(SITE_ONLY_PATHS));
  });

  it('menambah slug artikel dan kategori pada mode sempit maupun penuh', () => {
    for (const reason of ['publication.published', 'site_settings.changed']) {
      expect(pathsFor(reason, ['berita-utama'], ['politik'])).toEqual(expect.arrayContaining(['/berita-utama', '/categories/politik']));
    }
  });

  it('menyempitkan untuk reason robots artikel karena robots.txt hanya memuat setelan situs', () => {
    expect(pathsFor('article.robots.updated')).toEqual(ARTICLE_CORPUS_PATHS);
  });

  it('menyamakan|url persis dengan lintasan yang dipilih', () => {
    const narrow = completeInvalidationValues({ organizationId: 'org-1', siteId: 'site-1', currentHostname: 'tenant.example', reason: 'publication.published', articleSlugs: ['berita-utama'] });
    expect(narrow.urls).toEqual(['https://tenant.example/', 'https://tenant.example/berita-utama', 'https://tenant.example/llms.txt', 'https://tenant.example/news-sitemap.xml', 'https://tenant.example/rss.xml', 'https://tenant.example/sitemap.xml', 'https://tenant.example/tenant-home', 'https://tenant.example/tentang']);
  });

  it('mempertahankan url media di luar path yang disempitkan', () => {
    const values = completeInvalidationValues({ organizationId: 'org-1', siteId: 'site-1', currentHostname: 'tenant.example', reason: 'publication.published', mediaIds: ['media-1'] });
    expect(values.urls).toContain('https://tenant.example/api/network/media/media-1');
    expect(values.urls).toContain('https://tenant.example/api/network/media/media-1?variant=thumb');
  });
});
