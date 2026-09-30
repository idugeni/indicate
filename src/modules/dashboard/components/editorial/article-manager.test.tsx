// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleArchive } from '@/modules/dashboard/components/editorial/article-archive';

vi.mock('nuqs', async () => (await import('@/test/stubs/nuqs')).nuqsStub());

afterEach(() => {
  cleanup();
});

const DATA = {
  articles: [
    { id: 'a-1', title: 'Banjir Wonosobo', slug: 'banjir-wonosobo', status: 'active', publishedAt: '2026-09-20T00:00:00.000Z', tags: ['bencana', 'wonosobo'], categoryIds: ['c-1'], regionId: 'r-1' },
    { id: 'a-2', title: 'APBD Jateng', slug: 'apbd-jateng', status: 'draft', publishedAt: null, tags: ['ekonomi'], categoryIds: [], regionId: 'r-1' },
  ],
  categories: [{ id: 'c-1', name: 'Bencana' }],
  sites: [{ id: 's-1', normalizedHostname: 'fakta01.my.id' }],
  articleSites: [{ articleId: 'a-1', siteId: 's-1', active: true }],
};

describe('ArticleArchive', () => {
  it('menampilkan semua artikel lintas portal', () => {
    render(<ArticleArchive data={DATA} />);
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.getByText('APBD Jateng')).toBeDefined();
    expect(screen.getByText('1–2 dari 2')).toBeDefined();
  });

  it('menyembunyikan hostname di balik penghitung portal', async () => {
    const user = userEvent.setup();
    render(<ArticleArchive data={DATA} />);
    const toggle = screen.getByLabelText('Tampilkan daftar 1 portal');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('fakta01.my.id')).toBeNull();

    await user.click(toggle);
    expect(screen.getAllByText('fakta01.my.id')).toHaveLength(1);
    expect(screen.getByLabelText('Sembunyikan daftar portal').getAttribute('aria-expanded')).toBe('true');
  });

  it('tidak memanggil interaksi ulang untuk tiap viewport', () => {
    render(<ArticleArchive data={DATA} />);
    expect(screen.getAllByLabelText('Tampilkan daftar 1 portal')).toHaveLength(1);
  });

  it('menyaring lewat cari dan kategori', async () => {
    const user = userEvent.setup();
    render(<ArticleArchive data={DATA} />);
    await user.type(screen.getByLabelText('Cari judul/slug'), 'apbd');
    expect(screen.queryByText('Banjir Wonosobo')).toBeNull();
    expect(screen.getByText('APBD Jateng')).toBeDefined();
    await user.clear(screen.getByLabelText('Cari judul/slug'));
    await user.click(screen.getByLabelText('Kategori'));
    await user.click(await screen.findByRole('option', { name: 'Bencana' }));
    expect(screen.getByText('Banjir Wonosobo')).toBeDefined();
    expect(screen.queryByText('APBD Jateng')).toBeNull();
  });

  it('menawarkan hanya portal yang memuat artikel', async () => {
    const user = userEvent.setup();
    render(
      <ArticleArchive
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
    render(<ArticleArchive data={{ articles: DATA.articles, categories: DATA.categories, sites: DATA.sites, articleSites: [] }} />);
    expect(screen.getByText('Belum ada portal yang memuat artikel.')).toBeDefined();
    expect(screen.getByLabelText('Portal').getAttribute('placeholder')).toBe('Tidak ada portal');
  });

  it('menampilkan status kosong yang ramah', () => {
    render(<ArticleArchive data={{ articles: [], categories: [], sites: [], articleSites: [] }} />);
    expect(screen.getByText(/Tidak ada artikel yang cocok/)).toBeDefined();
  });
});
