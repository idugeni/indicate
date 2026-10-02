// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
            { id: 'a-1', title: 'Lama', slug: 'lama', status: 'active', publishedAt: '2026-09-10T00:00:00.000Z', tags: [], categoryIds: ['c-1'], regionId: 'r-1', createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z', version: 1 },
            { id: 'a-2', title: 'Baru', slug: 'baru', status: 'active', publishedAt: '2026-09-20T00:00:00.000Z', tags: [], categoryIds: ['c-1'], regionId: 'r-1', createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-21T00:00:00.000Z', version: 1 },
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

  it('mengarsipkan baris aktif tanpa refresh ganda', async () => {
    const user = userEvent.setup();
    const command = vi.fn(async () => ({ id: 'a-1', version: 3 }));
    render(<ArticleManager data={DATA} command={command} />);
    await user.click(screen.getByRole('button', { name: 'Arsipkan artikel Banjir Wonosobo' }));
    expect(command).toHaveBeenCalledWith('article.archive', { id: 'a-1', expectedVersion: 2 });
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
    await waitFor(() => expect(command).toHaveBeenCalledWith('article.delete', { id: 'a-2', expectedVersion: 1 }));
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
    expect(command).toHaveBeenCalledWith('article.restore', { id: 'a-3', expectedVersion: 5 });
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
