// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleManager } from '@/modules/dashboard/components/editorial/article-manager';

vi.mock('nuqs', async () => (await import('@/test/stubs/nuqs')).nuqsStub());

afterEach(() => {
  cleanup();
});

const DATA = {
  articles: [
    { id: 'a-1', title: 'Banjir Wonosobo', slug: 'banjir-wonosobo', status: 'active', publishedAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-22T00:00:00.000Z', tags: ['bencana', 'wonosobo'], categoryIds: ['c-1'], regionId: 'r-1', version: 2, body: 'Isi banjir.', excerpt: 'Ringkasan banjir.', canonicalUrl: null, publisherId: null, authorId: null, categoryId: 'c-1' },
    { id: 'a-2', title: 'APBD Jateng', slug: 'apbd-jateng', status: 'draft', publishedAt: null, updatedAt: '2026-09-21T00:00:00.000Z', tags: ['ekonomi'], categoryIds: [], regionId: 'r-1', version: 1, body: 'Isi APBD.', excerpt: null, canonicalUrl: null, publisherId: null, authorId: null, categoryId: null },
  ],
  categories: [{ id: 'c-1', name: 'Bencana' }],
  sites: [{ id: 's-1', normalizedHostname: 'fakta01.my.id' }],
  articleSites: [{ articleId: 'a-1', siteId: 's-1', active: true }],
};

describe('ArticleManager', () => {
  it('membatasi bawaan ke status aktif dan bernomor urut tanggal', async () => {
    const user = userEvent.setup();
    render(<ArticleManager data={DATA} />);
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.queryByText('APBD Jateng')).toBeNull();
    expect(screen.getByText('1–1 dari 1')).toBeDefined();
    expect(screen.getByText('#1')).toBeDefined();

    await user.clear(screen.getByLabelText('Status'));
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.getByText('APBD Jateng')).toBeDefined();
    expect(screen.getByText('1–2 dari 2')).toBeDefined();
  });

  it('mengurutkan bawaan dari tanggal terbaru', async () => {
    const user = userEvent.setup();
    render(
      <ArticleManager
        data={{
          ...DATA,
          articles: [
            { id: 'a-2', title: 'Baru', slug: 'baru', status: 'active', publishedAt: '2026-09-20T00:00:00.000Z', tags: [], categoryIds: ['c-1'], regionId: 'r-1', createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z', version: 1 },
            { id: 'a-1', title: 'Lama', slug: 'lama', status: 'active', publishedAt: '2026-09-10T00:00:00.000Z', tags: [], categoryIds: ['c-1'], regionId: 'r-1', createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', version: 1 },
          ],
        }}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]?.textContent).toContain('Baru');
    expect(rows[1]?.textContent).toContain('Lama');
    await user.clear(screen.getByLabelText('Status'));
  });

  it('membuka editor ubah dan menyimpan perubahan lewat article.update', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ id: 'a-1', version: 3 }));
    render(<ArticleManager data={DATA} command={command} />);
    await user.click(screen.getByRole('button', { name: 'Ubah artikel Banjir Wonosobo' }));
    expect(screen.getByRole('form', { name: 'Ubah Artikel' })).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('article.update', expect.objectContaining({ id: 'a-1', expectedVersion: 2 })));
  });

  it('menampilkan tanggal long beserta jam di samping tanggal terbit', () => {
    render(<ArticleManager data={DATA} />);
    expect(screen.getAllByText(/22 September 2026/).length).toBeGreaterThan(0);
  });

  it('mengarsipkan baris aktif dalam satu muat ulang', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ id: 'a-1', version: 3 }));
    render(<ArticleManager data={DATA} command={command} />);
    await user.click(screen.getByRole('button', { name: 'Arsipkan artikel Banjir Wonosobo' }));
    expect(command).toHaveBeenCalledWith('article.archive', { id: 'a-1', expectedVersion: 2 }, { refresh: true });
  });

  it('menghapus permanen draf lewat dialog konfirmasi', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ id: 'a-2' }));
    render(<ArticleManager data={DATA} command={command} />);
    expect(screen.getByRole('button', { name: 'Hapus permanen artikel Banjir Wonosobo' })).toBeDefined();
    await user.clear(screen.getByLabelText('Status'));
    await user.click(screen.getByRole('button', { name: 'Hapus permanen artikel APBD Jateng' }));
    expect(screen.getByText('Hapus permanen artikel?')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Hapus permanen' }));
    await waitFor(() => expect(command).toHaveBeenCalledWith('article.delete', { id: 'a-2', expectedVersion: 1 }, { refresh: true }));
  });

  it('menawarkan pulihkan untuk baris arsip', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ id: 'a-3', version: 2 }));
    render(
      <ArticleManager
        data={{
          ...DATA,
          articles: [{ id: 'a-3', title: 'Arsip Lama', slug: 'arsip-lama', status: 'archived', publishedAt: null, updatedAt: '2026-09-19T00:00:00.000Z', tags: [], categoryIds: [], regionId: 'r-1', version: 5 }],
        }}
        command={command}
      />,
    );
    await user.clear(screen.getByLabelText('Status'));
    await user.click(screen.getByLabelText('Status'));
    await user.click(await screen.findByRole('option', { name: 'Arsip' }));
    await user.click(screen.getByRole('button', { name: 'Pulihkan artikel Arsip Lama' }));
    expect(command).toHaveBeenCalledWith('article.restore', { id: 'a-3', expectedVersion: 5 }, { refresh: true });
  });

  it('menampilkan tanpa kategori alih-alih strip kosong', async () => {
    const user = userEvent.setup();
    render(<ArticleManager data={DATA} />);
    await user.clear(screen.getByLabelText('Status'));
    expect(screen.getAllByText(/Tanpa kategori/).length).toBeGreaterThan(0);
  });

  it('hanya menghitung dan menyaring portal apex', async () => {
    const user = userEvent.setup();
    render(
      <ArticleManager
        data={{
          ...DATA,
          sites: [
            { id: 's-1', normalizedHostname: 'fakta01.my.id', siteLevel: 'apex', domainId: 'd-1' },
            { id: 's-2', normalizedHostname: 'wonosobo.fakta01.my.id', siteLevel: 'city', domainId: 'd-1' },
            { id: 's-3', normalizedHostname: 'jawa-tengah.fakta01.my.id', siteLevel: 'region', domainId: 'd-2' },
          ],
          articleSites: [
            { articleId: 'a-1', siteId: 's-1', active: true },
            { articleId: 'a-1', siteId: 's-2', active: true },
            { articleId: 'a-1', siteId: 's-3', active: true },
          ],
        }}
      />,
    );
    expect(screen.getByLabelText('1 portal memuat artikel').textContent).toContain('1 portal');
    expect(screen.getByText('1 portal yang memuat artikel.')).toBeDefined();
    await user.click(screen.getByLabelText('Portal'));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['fakta01.my.id']);
  });

  it('menampilkan jumlah portal sebagai badge tanpa daftar hostname', () => {
    render(<ArticleManager data={DATA} />);
    expect(screen.getByLabelText('1 portal memuat artikel').textContent).toContain('1 portal');
    expect(screen.queryByText('fakta01.my.id')).toBeNull();
  });

  it('menampilkan badge 134 portal tanpa menumpuk baris', () => {
    const sites = Array.from({ length: 134 }, (_, index) => ({ id: `s-${index}`, normalizedHostname: `portal-${index}.example.id` }));
    render(
      <ArticleManager
        data={{
          ...DATA,
          sites,
          articleSites: sites.map((site) => ({ articleId: 'a-1', siteId: site.id, active: true })),
        }}
      />,
    );
    expect(screen.getByLabelText('134 portal memuat artikel').textContent).toContain('134 portal');
    expect(screen.queryByText('portal-0.example.id')).toBeNull();
  });

  it('menyaring lewat cari dan kategori', async () => {
    const user = userEvent.setup();
    render(<ArticleManager data={DATA} />);
    await user.clear(screen.getByLabelText('Status'));
    await user.type(screen.getByLabelText('Pencarian'), 'apbd');
    expect(screen.queryByText('Banjir Wonosobo')).toBeNull();
    expect(screen.getByText('APBD Jateng')).toBeDefined();
    await user.clear(screen.getByLabelText('Pencarian'));
    await user.click(screen.getByLabelText('Kategori'));
    await user.click(await screen.findByRole('option', { name: 'Bencana' }));
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.queryByText('APBD Jateng')).toBeNull();
  });

  it('menawarkan hanya portal yang memuat artikel', async () => {
    const user = userEvent.setup();
    render(
      <ArticleManager
        data={{
          ...DATA,
          sites: [
            { id: 's-1', normalizedHostname: 'fakta01.my.id' },
            { id: 's-2', normalizedHostname: 'wonosobo.fakta01.my.id' },
            { id: 's-3', normalizedHostname: 'kabar360.biz.id' },
            { id: 's-4', normalizedHostname: 'batang.kabar360.biz.id' },
          ],
        }}
      />,
    );
    expect(screen.getByText('1 portal yang memuat artikel.')).toBeDefined();
    await user.click(screen.getByLabelText('Portal'));
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['fakta01.my.id']);
  });

  it('menyatakan tidak ada portal saat belum ada artikel', () => {
    render(<ArticleManager data={{ articles: DATA.articles, categories: DATA.categories, sites: DATA.sites, articleSites: [] }} />);
    expect(screen.getByText('Belum ada portal yang memuat artikel.')).toBeDefined();
    expect(screen.getByLabelText('Portal').getAttribute('placeholder')).toBe('Tidak ada portal');
  });

  it('menampilkan status kosong yang ramah', () => {
    render(<ArticleManager data={{ articles: [], categories: [], sites: [], articleSites: [] }} />);
    expect(screen.getByText(/Tidak ada artikel yang cocok/)).toBeDefined();
  });
});

function makeServerArticles(count: number, prefix = 'srv'): Array<Record<string, unknown>> {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    title: `Judul ${prefix} ${String(index).padStart(2, '0')}`,
    slug: `slug-${prefix}-${index}`,
    status: 'active',
    publishedAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-22T00:00:00.000Z',
    tags: [],
    categoryIds: [],
    regionId: null,
    version: 1,
    body: 'Isi.',
  }));
}

describe('ArticleManager server-driven', () => {
  it('mengirim status bawaan aktif ke server dengan debounce', async () => {
    const onFilterApply = vi.fn();
    render(<ArticleManager data={DATA} onFilterApply={onFilterApply} />);
    await waitFor(() => expect(onFilterApply).toHaveBeenCalledWith('&status=active'), { timeout: 2000 });
  });

  it('mengenkode pencarian ke query server beserta status bawaan', async () => {
    const onFilterApply = vi.fn();
    render(<ArticleManager data={DATA} onFilterApply={onFilterApply} />);
    await waitFor(() => expect(onFilterApply).toHaveBeenCalledWith('&status=active'), { timeout: 2000 });
    onFilterApply.mockClear();
    fireEvent.change(screen.getByLabelText('Pencarian'), { target: { value: 'banjir & wonosobo' } });
    await waitFor(
      () => expect(onFilterApply).toHaveBeenCalledWith('&status=active&search=banjir%20%26%20wonosobo'),
      { timeout: 2000 },
    );
  });

  it('mengirim perubahan status ke query server', async () => {
    const user = userEvent.setup();
    const onFilterApply = vi.fn();
    render(<ArticleManager data={DATA} onFilterApply={onFilterApply} />);
    await waitFor(() => expect(onFilterApply).toHaveBeenCalled(), { timeout: 2000 });
    onFilterApply.mockClear();
    await user.click(screen.getByLabelText('Status'));
    await user.click(await screen.findByRole('option', { name: 'Draf' }));
    await waitFor(() => expect(onFilterApply).toHaveBeenCalledWith('&status=draft'), { timeout: 2000 });
  });

  it('allTags mengutamakan tagOptions model', async () => {
    const user = userEvent.setup();
    render(
      <ArticleManager
        data={{ ...DATA, tagOptions: [{ tag: 'server-tag', count: 5 }] }}
      />,
    );
    await user.click(screen.getByLabelText('Tag'));
    expect(await screen.findByRole('option', { name: 'server-tag' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'bencana' })).toBeNull();
  });

  it('memakai total server dari model untuk judul dan pager', () => {
    render(
      <ArticleManager
        data={{ ...DATA, total: 100, articlesNextCursor: null }}
        onLoadMoreArticles={vi.fn(async () => null)}
      />,
    );
    expect(screen.getByText('Kelola artikel (100)')).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('1–1 dari 100');
  });

  it('memakai articlesTotal prop saat model tanpa total', () => {
    render(<ArticleManager data={DATA} articlesTotal={77} />);
    expect(screen.getByText('Kelola artikel (77)')).toBeDefined();
    expect(screen.getByRole('status').textContent).toBe('1–1 dari 77');
  });

  it('tombol muat lebih muncul dengan cursor prop dan memanggil onLoadMoreArticles', async () => {
    const user = userEvent.setup();
    const onLoadMoreArticles = vi.fn(async () => ({ loaded: 2, total: 2, nextCursor: null }) as const);
    render(<ArticleManager data={DATA} articlesNextCursor="cur-1" onLoadMoreArticles={onLoadMoreArticles} />);
    const button = screen.getByRole('button', { name: 'Muat artikel lebih lama' });
    expect(button).toBeDefined();
    await user.click(button);
    await waitFor(() => expect(onLoadMoreArticles).toHaveBeenCalledTimes(1));
  });

  it('tombol muat lebih membaca cursor dari model dan sembunyi saat habis', () => {
    const onLoadMoreArticles = vi.fn(async () => null);
    const { rerender } = render(
      <ArticleManager data={{ ...DATA, articlesNextCursor: 'model-cur' }} onLoadMoreArticles={onLoadMoreArticles} />,
    );
    expect(screen.getByRole('button', { name: 'Muat artikel lebih lama' })).toBeDefined();
    rerender(<ArticleManager data={{ ...DATA, articlesNextCursor: null }} onLoadMoreArticles={onLoadMoreArticles} />);
    expect(screen.queryByRole('button', { name: 'Muat artikel lebih lama' })).toBeNull();
  });

  it('rerender dengan artikel tambahan menampilkan baris baru', () => {
    const onLoadMoreArticles = vi.fn(async () => null);
    const { rerender } = render(
      <ArticleManager data={DATA} articlesNextCursor="cur-1" onLoadMoreArticles={onLoadMoreArticles} />,
    );
    expect(screen.queryByText('Judul Tambahan')).toBeNull();
    rerender(
      <ArticleManager
        data={{
          ...DATA,
          articles: [
            ...DATA.articles,
            { id: 'a-3', title: 'Judul Tambahan', slug: 'judul-tambahan', status: 'active', publishedAt: null, updatedAt: '2026-09-23T00:00:00.000Z', tags: [], categoryIds: [], regionId: 'r-1', version: 1, body: 'Isi tambahan.' },
          ],
          articlesNextCursor: null,
        }}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    expect(screen.getByText('Judul Tambahan')).toBeDefined();
  });

  it('jump-fill memanggil onLoadMoreArticles saat lompat halaman', async () => {
    const onLoadMoreArticles = vi.fn(async () => ({ loaded: 40, total: 45, nextCursor: null }) as const);
    render(
      <ArticleManager
        data={{ articles: makeServerArticles(20), categories: [], sites: [], articleSites: [], total: 45, articlesNextCursor: 'cur-1' }}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    expect(screen.getByRole('status').textContent).toBe('1–20 dari 45');
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    await waitFor(() => expect(onLoadMoreArticles).toHaveBeenCalled(), { timeout: 2000 });
  });

  it('jump-fill berhenti setelah 10 percobaan saat kursor macet', async () => {
    const onLoadMoreArticles = vi.fn(async () => ({ loaded: 5, total: 500, nextCursor: 'stuck' }) as const);
    render(
      <ArticleManager
        data={{ articles: makeServerArticles(5), categories: [], sites: [], articleSites: [], total: 500, articlesNextCursor: 'stuck' }}
        onLoadMoreArticles={onLoadMoreArticles}
      />,
    );
    fireEvent.click(screen.getByLabelText('Ke halaman berikutnya'));
    await waitFor(() => expect(onLoadMoreArticles).toHaveBeenCalledTimes(10), { timeout: 3000 });
  });
});
