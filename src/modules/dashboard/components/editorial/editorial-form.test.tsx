// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EditorialForm } from '@/modules/dashboard/components/editorial/editorial-form';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

afterEach(() => {
  cleanup();
});

const DATA = {
  regions: [{ id: 'r-1', name: 'Wonosobo' }],
  publishers: [
    { id: 'p-1', name: 'Penerbit Uji', status: 'active' },
    { id: 'p-2', name: 'Penerbit Arsip', status: 'archived' },
  ],
  categories: [{ id: 'c-1', name: 'Politik' }],
  authors: [{ id: 'a-1', displayName: 'Penulis Uji' }],
  domains: [{ id: 'd-1', normalizedHostname: 'fakta01.my.id' }],
  sites: [
    { id: 's-1', normalizedHostname: 'wonosobo.fakta01.my.id', domainId: 'd-1' },
    { id: 's-2', normalizedHostname: 'semarang.fakta01.my.id', domainId: 'd-1' },
  ],
  articles: [{ id: 'art-1', title: 'Artikel Uji' }],
  articleSites: [{ articleId: 'art-1', siteId: 's-1' }],
};

function setup(overrides: {
  submit?: (payload: unknown) => Promise<unknown>;
  assign?: (payload: unknown) => Promise<unknown>;
}) {
  const submit = vi.fn(async (payload: unknown) => (overrides.submit ? overrides.submit(payload) : null));
  const assign = vi.fn(async (payload: unknown) => (overrides.assign ? overrides.assign(payload) : null));
  const cmd = vi.fn(async () => ({}));
  const { container } = render(<EditorialForm data={DATA} onSubmit={submit} onAssign={assign} command={cmd} />);
  return { submit, assign, cmd, container };
}

describe('Formulir redaksi', () => {
  it('merender panel naskah dan alokasi portal', () => {
    setup({});
    expect(screen.getByText('Artikel Baru')).toBeDefined();
    expect(screen.getByText('Penyaluran Artikel')).toBeDefined();
    expect(screen.getByRole('button', { name: /simpan draf/i })).toBeDefined();
  });

  it('menyembunyikan penerbit arsip dari formulir artikel', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByLabelText('Penerbit'));
    expect(screen.queryByRole('option', { name: 'Penerbit Arsip' })).toBeNull();
    expect(await screen.findByRole('option', { name: 'Penerbit Uji' })).toBeDefined();
  });

  it('mengisi slug otomatis dari judul saat blur', () => {
    setup({});
    const titleInput = screen.getByLabelText('Judul Artikel');
    fireEvent.change(titleInput, { target: { value: 'Judul Berita Hari Ini' } });
    fireEvent.blur(titleInput);
    expect((screen.getByLabelText('Slug URL') as HTMLInputElement).value).toBe(
      'judul-berita-hari-ini',
    );
  });

  it('mengirim naskah baru sebagai draf', async () => {
    const { submit, container } = setup({});
    const titleInput = screen.getByLabelText('Judul Artikel');
    fireEvent.change(titleInput, { target: { value: 'Judul Uji' } });
    fireEvent.blur(titleInput);
    fireEvent.change(screen.getByLabelText('Sumber'), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Judul Uji', slug: 'judul-uji', status: 'draft' }),
      ),
    );
  });

  it('menyalurkan ke seluruh situs domain secara default', async () => {
    const { assign, container } = setup({});
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-1', 's-2'] }),
    );
  });

  it('mengecualikan situs saat domain tidak dicentang', async () => {
    const { assign, container } = setup({});
    fireEvent.click(screen.getByRole('checkbox', { name: 'fakta01.my.id' }));
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: [] }),
    );
  });

  it('menyimpan jumlah tayang ke situs tersalurkan saja', async () => {
    const { cmd, container } = setup({});
    fireEvent.change(screen.getByLabelText(/Jumlah tayang/), { target: { value: '250' } });
    fireEvent.submit(container.querySelectorAll('form')[2] as HTMLFormElement);
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith('article.sites.views.set', { articleId: 'art-1', siteId: 's-1', viewCount: 250 }),
    );
    expect(cmd).toHaveBeenCalledTimes(1);
  });
});
