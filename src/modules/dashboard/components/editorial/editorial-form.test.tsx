// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { EditorialForm } from '@/modules/dashboard/components/editorial/editorial-form';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

afterEach(() => {
  cleanup();
});

const DATA = {
  regions: [{ id: 'r-1', name: 'Wonosobo' }],
  publishers: [{ id: 'p-1', name: 'Penerbit Uji' }],
  categories: [{ id: 'c-1', name: 'Politik' }],
  authors: [{ id: 'a-1', displayName: 'Penulis Uji' }],
  sites: [{ id: 's-1', normalizedHostname: 'portal.example' }],
  articles: [{ id: 'art-1', title: 'Artikel Uji' }],
};

function setup(overrides: {
  submit?: (payload: unknown) => Promise<unknown>;
  assign?: (payload: unknown) => Promise<unknown>;
  setViews?: (payload: unknown) => Promise<unknown>;
}) {
  const submit = vi.fn(async (payload: unknown) => (overrides.submit ? overrides.submit(payload) : null));
  const assign = vi.fn(async (payload: unknown) => (overrides.assign ? overrides.assign(payload) : null));
  const setViews = vi.fn(async (payload: unknown) => (overrides.setViews ? overrides.setViews(payload) : null));
  const { container } = render(<EditorialForm data={DATA} onSubmit={submit} onAssign={assign} onSetViews={setViews} />);
  return { submit, assign, setViews, container };
}

describe('Formulir redaksi', () => {
  it('merender panel naskah dan alokasi portal', () => {
    setup({});
    expect(screen.getByText('Artikel Baru')).toBeDefined();
    expect(screen.getByText('Penyaluran Artikel')).toBeDefined();
    expect(screen.getByRole('button', { name: /simpan draf/i })).toBeDefined();
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

  it('menerapkan pemetaan situs ke artikel', async () => {
    const { assign, container } = setup({});
    fireEvent.click(screen.getByRole('checkbox', { name: /portal\.example/ }));
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-1'] }),
    );
  });

  it('menyimpan jumlah tayang manual', async () => {
    const { setViews, container } = setup({});
    fireEvent.submit(container.querySelectorAll('form')[2] as HTMLFormElement);
    await waitFor(() =>
      expect(setViews).toHaveBeenCalledWith({ articleId: 'art-1', siteId: 's-1', viewCount: 0 }),
    );
  });
});
