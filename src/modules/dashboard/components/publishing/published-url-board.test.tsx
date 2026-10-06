// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PublishedUrlBoard, collectPublishedUrls } from '@/modules/dashboard/components/publishing/published-url-board';

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());
vi.mock('nuqs', async () => (await import('@/test/stubs/nuqs')).nuqsStub());

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
  it('merender satu kartu ringkas per artikel dengan blok yang bisa dibuka', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} />);
    expect(screen.getByText('Berita Pertama')).toBeDefined();
    expect(screen.getByText('2 URL Tayang')).toBeDefined();
    expect(screen.queryByText('https://alpha.example/berita-pertama')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: /buka detail/i })[0]!);
    expect(screen.getByText('https://alpha.example/berita-pertama')).toBeDefined();
  });

  it('menyaring artikel berdasarkan judul dan slug', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} />);
    fireEvent.change(screen.getByLabelText('Cari Berita'), { target: { value: 'tidak-ada' } });
    expect(screen.getByText('Tidak ada berita yang cocok')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Cari Berita'), { target: { value: 'berita-pertama' } });
    expect(screen.getByText('Berita Pertama')).toBeDefined();
  });

  it('menyatakan kosong saat belum ada yang tayang', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: [] }} />);
    expect(screen.getByText('Belum ada artikel yang tayang di jaringan')).toBeDefined();
  });

  it('menggabungkan URL bridge pemilik ke daftar tayang per-org', () => {
    render(
      <PublishedUrlBoard
        data={{
          articles: ARTICLES,
          sites: SITES,
          articleSites: [],
          bridgePublished: [{ articleId: 'art-2', urls: ['https://wonosobo.example/berita-kedua'], publishedAtMax: '2026-10-05T09:17:46.000Z' }],
        }}
      />,
    );
    expect(screen.getByText('Berita Kedua')).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: /buka detail/i })[0]!);
    expect(screen.getByText('https://wonosobo.example/berita-kedua')).toBeDefined();
  });

  it('tahan payload rusak tanpa melempar', () => {
    render(<PublishedUrlBoard data={null} />);
    expect(screen.getByText('Belum ada artikel yang tayang di jaringan')).toBeDefined();
  });

  it('mode lintas-org memakai URL denormalisasi dan lencana org', () => {
    render(
      <PublishedUrlBoard
        data={{
          articles: [
            { id: 'x-1', title: 'Kabar UPT', slug: 'kabar-upt', publishedAt: null, publishedAtMax: '2026-10-06T04:23:50.000Z', publishedUrls: ['https://wonosobo.example/kabar-upt'], orgName: 'RUTAN WONOSOBO' },
          ],
          total: 1,
          articlesNextCursor: null,
        }}
        crossOrg
      />,
    );
    expect(screen.getByText('Kabar UPT')).toBeDefined();
    expect(screen.getByText('RUTAN WONOSOBO')).toBeDefined();
    expect(screen.getByText('1 Portal Aktif')).toBeDefined();
  });

  it('tidak merender toggle lintas-org: mode lintas-org selalu aktif', () => {
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} crossOrg />);
    expect(screen.queryByLabelText('Tampilkan artikel tayang semua organisasi')).toBeNull();
  });
});

const pagedArticles = Array.from({ length: 25 }, (unused, index) => ({
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

  it('menyorot satu blok URL utuh per artikel setelah dibuka, tidak memotong antarhalaman', () => {
    render(<PublishedUrlBoard data={pagedData} />);
    fireEvent.click(screen.getAllByRole('button', { name: /buka detail/i })[0]!);
    expect(screen.getByText('https://alpha.example/berita-00')).toBeDefined();
  });

  it('kembali ke halaman pertama saat kata kunci berubah', () => {
    render(<PublishedUrlBoard data={pagedData} />);
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    expect(screen.getByRole('status').textContent).toBe('21–25 dari 25');

    fireEvent.change(screen.getByLabelText('Cari Berita'), { target: { value: 'Berita 00' } });
    expect(screen.getByRole('status').textContent).toBe('1–1 dari 1');
  });
});

describe('PublishedUrlBoard server-driven', () => {
  it('mengirim sort bawaan published-desc dengan debounce', async () => {
    const onFilterApply = vi.fn();
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} onFilterApply={onFilterApply} />);
    await waitFor(
      () => expect(onFilterApply).toHaveBeenCalledWith('&publicationState=published&sort=published-desc'),
      { timeout: 2000 },
    );
  });

  it('mengirim search yang dienkode beserta sort aktif', async () => {
    const onFilterApply = vi.fn();
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} onFilterApply={onFilterApply} />);
    await waitFor(() => expect(onFilterApply).toHaveBeenCalled(), { timeout: 2000 });
    onFilterApply.mockClear();
    fireEvent.change(screen.getByLabelText('Cari Berita'), { target: { value: 'berita & kedua' } });
    await waitFor(
      () => expect(onFilterApply).toHaveBeenCalledWith('&publicationState=published&sort=published-desc&search=berita%20%26%20kedua'),
      { timeout: 2000 },
    );
  });

  it.each([
    ['Terlama Ditayangkan', 'published-asc'],
    ['Jaringan Portal Terbanyak', 'syndicated'],
    ['Abjad Judul (A-Z)', 'title'],
  ] as const)('sort %s mengirim param server %s', async (label, param) => {
    const user = userEvent.setup();
    const onFilterApply = vi.fn();
    render(<PublishedUrlBoard data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }} onFilterApply={onFilterApply} />);
    await waitFor(() => expect(onFilterApply).toHaveBeenCalled(), { timeout: 2000 });
    onFilterApply.mockClear();
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: label }));
    await waitFor(
      () => expect(onFilterApply).toHaveBeenCalledWith(`&publicationState=published&sort=${param}`),
      { timeout: 2000 },
    );
  });

  it('tidak mengurut ulang di klien saat sort berubah: urutan tetap milik server', async () => {
    const user = userEvent.setup();
    const twoArticles = [
      { id: 'a-z', title: 'Zebra', slug: 'zebra', publishedAt: '2026-09-25T10:00:00.000Z' },
      { id: 'a-a', title: 'Alpha', slug: 'alpha', publishedAt: '2026-09-20T10:00:00.000Z' },
    ];
    const twoSites = [{ id: 'site-a', normalizedHostname: 'alpha.example' }];
    const twoRows = [
      { articleId: 'a-z', siteId: 'site-a', state: 'published', publishedUrl: null, publishedAt: '2026-09-25T10:00:00.000Z' },
      { articleId: 'a-a', siteId: 'site-a', state: 'published', publishedUrl: null, publishedAt: '2026-09-20T10:00:00.000Z' },
    ];
    const onFilterApply = vi.fn();
    render(<PublishedUrlBoard data={{ articles: twoArticles, sites: twoSites, articleSites: twoRows }} onFilterApply={onFilterApply} />);
    const before = document.body.innerHTML;
    expect(before.indexOf('Zebra')).toBeGreaterThan(-1);
    expect(before.indexOf('Zebra')).toBeLessThan(before.indexOf('Alpha'));
    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Abjad Judul (A-Z)' }));
    await waitFor(() => expect(onFilterApply).toHaveBeenCalledWith(expect.stringContaining('sort=title')), { timeout: 2000 });
    const after = document.body.innerHTML;
    expect(after.indexOf('Zebra')).toBeLessThan(after.indexOf('Alpha'));
  });

  it('memakai total dari payload untuk teks Menampilkan', () => {
    render(
      <PublishedUrlBoard
        data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES, total: 50, articlesNextCursor: null }}
      />,
    );
    expect(screen.getByText(/Menampilkan 1 dari 50 artikel tersindikasi/)).toBeDefined();
  });

  it('memakai articlesTotal prop saat model tanpa total', () => {
    render(
      <PublishedUrlBoard
        data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }}
        articlesTotal={77}
      />,
    );
    expect(screen.getByText(/Menampilkan 1 dari 77 artikel tersindikasi/)).toBeDefined();
  });

  it('tombol muat lebih muncul dengan cursor dan memanggil onLoadMoreArticles', async () => {
    const user = userEvent.setup();
    const onLoadMoreArticles = vi.fn(async () => ({ loaded: 1, total: 1, nextCursor: null }) as const);
    render(
      <PublishedUrlBoard
        data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES }}
        articlesNextCursor="cur-1"
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    const button = screen.getByRole('button', { name: 'Muat lebih lama' });
    expect(button).toBeDefined();
    await user.click(button);
    await waitFor(() => expect(onLoadMoreArticles).toHaveBeenCalledTimes(1));
  });

  it('tombol muat lebih membaca cursor dari model dan sembunyi saat habis', () => {
    const onLoadMoreArticles = vi.fn(async () => null);
    const { rerender } = render(
      <PublishedUrlBoard
        data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES, articlesNextCursor: 'model-cur' }}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    expect(screen.getByRole('button', { name: 'Muat lebih lama' })).toBeDefined();
    rerender(
      <PublishedUrlBoard
        data={{ articles: ARTICLES, sites: SITES, articleSites: ARTICLE_SITES, articlesNextCursor: null }}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Muat lebih lama' })).toBeNull();
  });

  it('jump-fill memanggil onLoadMoreArticles saat lompat halaman', async () => {
    const onLoadMoreArticles = vi.fn(async () => ({ loaded: 40, total: 45, nextCursor: null }) as const);
    render(
      <PublishedUrlBoard
        data={{ articles: pagedArticles, sites: SITES, articleSites: pagedArticleSites, total: 45, articlesNextCursor: 'cur-1' }}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    await waitFor(() => expect(onLoadMoreArticles).toHaveBeenCalled(), { timeout: 2000 });
  });
});
