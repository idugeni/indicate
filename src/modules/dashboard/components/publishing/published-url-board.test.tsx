// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { PublishedUrlBoard, collectPublishedUrls } from '@/modules/dashboard/components/publishing/published-url-board';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ARTICLES = [
  { id: 'art-1', title: 'Berita Pertama', slug: 'berita-pertama', publishedAt: '2026-09-20T10:00:00.000Z' },
  { id: 'art-2', title: 'Berita Kedua', slug: 'berita-kedua', publishedAt: '2026-09-25T10:00:00.000Z' },
];

const SITES = [
  { id: 'site-b', normalizedHostname: 'beta.example' },
  { id: 'site-a', normalizedHostname: 'alpha.example' },
];

const ARTICLE_SITES = [
  { articleId: 'art-1', siteId: 'site-b', state: 'published', publishedUrl: null, publishedAt: '2026-09-20T10:00:00.000Z' },
  { articleId: 'art-1', siteId: 'site-a', state: 'published', publishedUrl: 'https://alpha.example/berita-pertama', publishedAt: '2026-09-20T10:00:00.000Z' },
  { articleId: 'art-1', siteId: 'site-a', state: 'queued', publishedUrl: null, publishedAt: null },
  { articleId: 'art-2', siteId: 'site-a', state: 'failed', publishedUrl: null, publishedAt: null },
];

describe('collectPublishedUrls', () => {
  it('mengelompokkan URL tayang per artikel dan mengurutkan artikel terbaru dulu', () => {
    const result = collectPublishedUrls({ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES });
    expect(result.map((entry) => entry.articleId)).toEqual(['art-1']);
    expect(result[0]?.urls).toEqual(['https://alpha.example/berita-pertama', 'https://beta.example/berita-pertama']);
    expect(result[0]?.publishedAt).toBe('2026-09-20T10:00:00.000Z');
  });

  it('menyusun URL dari hostname dan slug saat published_url belum tertulis', () => {
    const result = collectPublishedUrls({
      articles: [{ id: 'art-3', title: 'Tanpa URL Tertulis', slug: 'tanpa-url', publishedAt: null }],
      sites: [{ id: 'site-x', normalizedHostname: 'gamma.example' }],
      articleSites: [{ articleId: 'art-3', siteId: 'site-x', state: 'published', publishedUrl: null, publishedAt: null }],
    });
    expect(result[0]?.urls).toEqual(['https://gamma.example/tanpa-url']);
  });

  it('membuang baris non-published, situs tak dikenal, dan artikel tak dikenal', () => {
    const result = collectPublishedUrls({
      articles: ARTICLES,
      sites: SITES,
      articleSites: [
        ...ARTICLE_SITES,
        { articleId: 'art-2', siteId: 'site-a', state: 'queued', publishedUrl: null, publishedAt: null },
        { articleId: 'art-2', siteId: 'site-hilang', state: 'published', publishedUrl: null, publishedAt: null },
        { articleId: 'art-hilang', siteId: 'site-a', state: 'published', publishedUrl: null, publishedAt: null },
      ],
    });
    expect(result.map((entry) => entry.articleId)).toEqual(['art-1']);
  });

  it('membuang URL duplikat pada satu artikel', () => {
    const result = collectPublishedUrls({
      articles: ARTICLES,
      sites: SITES,
      articleSites: [
        { articleId: 'art-1', siteId: 'site-a', state: 'published', publishedUrl: 'https://alpha.example/berita-pertama', publishedAt: '2026-09-20T10:00:00.000Z' },
        { articleId: 'art-1', siteId: 'site-a', state: 'published', publishedUrl: 'https://alpha.example/berita-pertama', publishedAt: '2026-09-20T10:00:00.000Z' },
      ],
    });
    expect(result[0]?.urls).toEqual(['https://alpha.example/berita-pertama']);
  });
});

describe('PublishedUrlBoard', () => {
  it('merender satu kartu per artikel tayang dengan blok bernomor', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} />);
    expect(screen.getByText('Berita Pertama')).toBeDefined();
    expect(screen.getByText('2 URL tayang')).toBeDefined();
    expect(screen.getByLabelText('Daftar URL untuk Berita Pertama').textContent).toContain('1. https://alpha.example/berita-pertama');
  });

  it('menyaring artikel berdasarkan judul dan slug', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} />);
    fireEvent.change(screen.getByLabelText('Cari artikel yang tayang'), { target: { value: 'tidak-ada' } });
    expect(screen.getByText('Tidak ada artikel yang cocok.')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Cari artikel yang tayang'), { target: { value: 'berita-pertama' } });
    expect(screen.getByText('Berita Pertama')).toBeDefined();
  });

  it('menyatakan kosong saat belum ada yang tayang', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: [] }} />);
    expect(screen.getByText('Belum ada artikel yang tayang.')).toBeDefined();
  });

  it('tahan payload rusak tanpa melempar', () => {
    render(<PublishedUrlBoard data={null} />);
    expect(screen.getByText('Belum ada artikel yang tayang.')).toBeDefined();
  });
});

const pagedArticles = Array.from({ length: 25 }, (_unused, index) => ({
  id: `art-${index}`,
  title: `Berita ${String(index).padStart(2, '0')}`,
  slug: `berita-${String(index).padStart(2, '0')}`,
  publishedAt: '2026-09-20T10:00:00.000Z',
}));
const pagedArticleSites = pagedArticles.map((article) => ({
  articleId: article.id,
  siteId: 'site-a',
  state: 'published',
  publishedUrl: null,
  publishedAt: article.publishedAt,
}));
const pagedData = { articles: pagedArticles, sites: SITES, articleSites: pagedArticleSites };

describe('PublishedUrlBoard pagination', () => {
  it('merender 20 kartu per halaman dan sisa artikel di halaman berikutnya', () => {
    render(<PublishedUrlBoard data={pagedData} />);
    expect(screen.getByRole('status').textContent).toBe('1–20 dari 25');
    expect(screen.getByText('Berita 19')).toBeDefined();
    expect(screen.queryByText('Berita 20')).toBeNull();

    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(screen.getByRole('status').textContent).toBe('21–25 dari 25');
    expect(screen.getByText('Berita 20')).toBeDefined();
    expect(screen.queryByText('Berita 19')).toBeNull();
  });

  it('menonaktifkan navigasi di kedua batas', () => {
    render(<PublishedUrlBoard data={pagedData} />);
    expect(screen.getByLabelText('Ke halaman sebelumnya').getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByLabelText('Ke halaman berikutnya').getAttribute('aria-disabled')).toBe('false');

    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(screen.getByLabelText('Ke halaman sebelumnya').getAttribute('aria-disabled')).toBe('false');
    expect(screen.getByLabelText('Ke halaman berikutnya').getAttribute('aria-disabled')).toBe('true');
  });

  it('menyorot satu blok URL utuh per artikel, tidak memotong antarhalaman', () => {
    render(<PublishedUrlBoard data={pagedData} />);
    expect(screen.getByLabelText('Daftar URL untuk Berita 00').textContent).toContain('1. https://alpha.example/berita-00');
  });

  it('kembali ke halaman pertama saat kata kunci berubah', () => {
    render(<PublishedUrlBoard data={pagedData} />);
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(screen.getByRole('status').textContent).toBe('21–25 dari 25');

    fireEvent.change(screen.getByLabelText('Cari artikel yang tayang'), { target: { value: 'Berita 00' } });
    expect(screen.getByRole('status').textContent).toBe('1–1 dari 1');
  });
});
