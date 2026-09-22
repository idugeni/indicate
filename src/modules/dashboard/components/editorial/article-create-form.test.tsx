// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleCreateForm } from '@/modules/dashboard/components/editorial/editorial-form';

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
  categories: [
    { id: 'c-1', name: 'Politik', status: 'active' },
    { id: 'c-2', name: 'Ekonomi', status: 'active' },
    { id: 'c-3', name: 'Arsip Lama', status: 'archived' },
  ],
  authors: [{ id: 'a-1', displayName: 'Penulis Uji' }],
  articles: [{ id: 'art-1', title: 'Artikel Uji' }],
};

function setup(overrides: {
  submit?: (payload: unknown) => Promise<unknown>;
}) {
  const submit = vi.fn(async (payload: unknown) => (overrides.submit ? overrides.submit(payload) : null));
  const cmd = vi.fn(async () => ({}));
  const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
  return { submit, cmd, container };
}

describe('Formulir tulis artikel', () => {
  it('merender panel naskah saja tanpa penyaluran', () => {
    setup({});
    expect(screen.getByText('Artikel Baru')).toBeDefined();
    expect(screen.queryByText('Penyaluran Artikel')).toBeNull();
    expect(screen.queryByText('Pilih Artikel Target')).toBeNull();
    expect(screen.getByRole('button', { name: /simpan draf/i })).toBeDefined();
  });

  it('menyembunyikan penerbit arsip dari formulir artikel', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByLabelText('Penerbit'));
    expect(screen.queryByRole('option', { name: 'Penerbit Arsip' })).toBeNull();
    expect(await screen.findByRole('option', { name: 'Penerbit Uji' })).toBeDefined();
  });

  it('menyaring penerbit saat diketik dan mengirim id terpilih', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByLabelText('Penerbit'));
    await user.type(screen.getByLabelText('Penerbit'), 'uji');
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Mandiri (tanpa penerbit)' })).toBeNull());
    await user.keyboard('{Enter}');
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ publisherId: 'p-1' })),
    );
  });

  it('menambah topik lewat saran tag dan mengirimkannya', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    const tagsInput = screen.getByLabelText(/Topik \(koma, maks\. 10\)/);
    await user.click(tagsInput);
    await user.type(tagsInput, 'wonosobo');
    await user.keyboard('{Enter}');
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ tags: ['wonosobo'] })),
    );
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
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Judul Uji', slug: 'judul-uji', status: 'draft' }),
      ),
    );
  });

  it('merender sidebar CMS dengan kartu terbit, atribusi, topik, dan sumber', () => {
    setup({});
    expect(screen.getByRole('region', { name: 'Terbitkan' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Atribusi' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Topik' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Sumber' })).toBeDefined();
    expect(screen.getByLabelText('Penulis')).toBeDefined();
    expect(screen.getByLabelText('Ringkasan (opsional)')).toBeDefined();
    expect(screen.getByLabelText('Subheadline (opsional)')).toBeDefined();
    expect(screen.getByLabelText('URL Kanonis (opsional)')).toBeDefined();
  });

  it('mengirim dek, ringkasan, kanonis, penulis, dan status draf', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.change(screen.getByLabelText('Ringkasan (opsional)'), { target: { value: 'Inti berita.' } });
    fireEvent.change(screen.getByLabelText('Subheadline (opsional)'), { target: { value: 'Anak judul.' } });
    fireEvent.change(screen.getByLabelText('URL Kanonis (opsional)'), { target: { value: 'https://sumber.example/rilis' } });
    await user.click(screen.getByLabelText('Penulis'));
    await user.click(await screen.findByRole('option', { name: 'Penulis Uji' }));
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          dek: 'Anak judul.',
          excerpt: 'Inti berita.',
          canonicalUrl: 'https://sumber.example/rilis',
          authorId: 'a-1',
          status: 'draft',
          scheduledAt: undefined,
        }),
      ),
    );
  });

  it('mengirim beberapa kategori dengan yang pertama sebagai primer', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByLabelText(/Kategori/));
    await user.click(await screen.findByRole('option', { name: 'Ekonomi' }));
    await user.click(await screen.findByRole('option', { name: 'Politik' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: ['c-2', 'c-1'] })),
    );
  });

  it('menyembunyikan kategori arsip dari combobox', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByLabelText(/Kategori/));
    expect(await screen.findByRole('option', { name: 'Politik' })).toBeDefined();
    expect(screen.queryByRole('option', { name: 'Arsip Lama' })).toBeNull();
  });

  it('memilih otomatis kategori yang sudah ada walau beda huruf', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByLabelText(/Kategori/));
    await user.type(screen.getByLabelText(/Kategori/), 'POLITIK');
    expect(screen.queryByRole('button', { name: /sebagai kategori baru/ })).toBeNull();
    await user.keyboard('{Enter}');
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: ['c-1'] })),
    );
  });

  it('membuat kategori baru lewat tombol cerdas di dalam combobox', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => null);
    const cmd = vi.fn(async (action: string) => (action === 'category.create' ? { id: 'c-9' } : {}));
    const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
    await user.click(screen.getByLabelText(/Kategori/));
    await user.type(screen.getByLabelText(/Kategori/), 'Olahraga');
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull());
    await user.click(screen.getByRole('button', { name: /Tambah.*Olahraga.*kategori baru/ }));
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith('category.create', { name: 'Olahraga', slug: 'olahraga' }),
    );
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: ['c-9'] })),
    );
  });

  it('mengirim URL sampul luar tanpa unggahan', async () => {
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.change(screen.getByLabelText(/URL gambar luar/), { target: { value: 'https://sumber.example/sampul.jpg' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ leadMediaId: null, coverImageUrl: 'https://sumber.example/sampul.jpg' }),
      ),
    );
  });

  it('mengunggah sampul dan mengirim id medianya', async () => {
    const putMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', putMock);
    try {
      const submit = vi.fn(async () => null);
      const cmd = vi.fn(async (action: string) => {
        if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { Authorization: 'sig' } } };
        if (action === 'media.complete') return { id: 'm-1' };
        return {};
      });
      const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
      const file = new File(['isi-gambar'], 'sampul.png', { type: 'image/png' });
      const input = container.querySelector('input[data-testid="featured-file-input"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.reserve', expect.objectContaining({ filename: 'sampul.png' })));
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.complete', { reservationId: 'res-1' }));
      fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
      fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
      fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
      fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
      await waitFor(() =>
        expect(submit).toHaveBeenCalledWith(expect.objectContaining({ leadMediaId: 'm-1' })),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('menolak status terjadwal tanpa jadwal terbit', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByLabelText('Status'));
    await user.click(await screen.findByRole('option', { name: 'Terjadwal' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });

  it('mengirim status terjadwal beserta jadwal terbit', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByLabelText('Status'));
    await user.click(await screen.findByRole('option', { name: 'Terjadwal' }));
    fireEvent.change(screen.getByLabelText('Jadwal terbit'), { target: { value: '2026-09-23T10:00' } });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText(/Isi Artikel Lengkap/), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scheduled', scheduledAt: '2026-09-23T10:00:00' }),
      ),
    );
  });
});
