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

function pasang(perintah: {
  kirim?: (muatan: unknown) => Promise<unknown>;
  alokasi?: (muatan: unknown) => Promise<unknown>;
  tayang?: (muatan: unknown) => Promise<unknown>;
}) {
  const kirim = vi.fn(async (muatan: unknown) => (perintah.kirim ? perintah.kirim(muatan) : null));
  const alokasi = vi.fn(async (muatan: unknown) => (perintah.alokasi ? perintah.alokasi(muatan) : null));
  const tayang = vi.fn(async (muatan: unknown) => (perintah.tayang ? perintah.tayang(muatan) : null));
  const { container } = render(<EditorialForm data={DATA} onSubmit={kirim} onAssign={alokasi} onSetViews={tayang} />);
  return { kirim, alokasi, tayang, container };
}

describe('Formulir redaksi', () => {
  it('merender panel naskah dan alokasi portal', () => {
    pasang({});
    expect(screen.getByText('Artikel Baru')).toBeDefined();
    expect(screen.getByText('Penyaluran Artikel')).toBeDefined();
    expect(screen.getByRole('button', { name: /simpan draf/i })).toBeDefined();
  });

  it('mengisi slug otomatis dari judul saat blur', () => {
    pasang({});
    const judul = screen.getByLabelText('Judul Artikel');
    fireEvent.change(judul, { target: { value: 'Judul Berita Hari Ini' } });
    fireEvent.blur(judul);
    expect((screen.getByLabelText('Slug URL') as HTMLInputElement).value).toBe(
      'judul-berita-hari-ini',
    );
  });

  it('mengirim naskah baru sebagai draf', async () => {
    const { kirim, container } = pasang({});
    const judul = screen.getByLabelText('Judul Artikel');
    fireEvent.change(judul, { target: { value: 'Judul Uji' } });
    fireEvent.blur(judul);
    fireEvent.change(screen.getByLabelText('Sumber'), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(kirim).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Judul Uji', slug: 'judul-uji', status: 'draft' }),
      ),
    );
  });

  it('menerapkan pemetaan situs ke artikel', async () => {
    const { alokasi, container } = pasang({});
    fireEvent.click(screen.getByRole('checkbox', { name: /portal\.example/ }));
    fireEvent.submit(container.querySelectorAll('form')[1] as HTMLFormElement);
    await waitFor(() =>
      expect(alokasi).toHaveBeenCalledWith({ articleId: 'art-1', siteIds: ['s-1'] }),
    );
  });

  it('menyimpan jumlah tayang manual', async () => {
    const { tayang, container } = pasang({});
    fireEvent.submit(container.querySelectorAll('form')[2] as HTMLFormElement);
    await waitFor(() =>
      expect(tayang).toHaveBeenCalledWith({ articleId: 'art-1', siteId: 's-1', viewCount: 0 }),
    );
  });
});
