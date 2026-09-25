// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleCreateForm } from '@/modules/dashboard/components/editorial/editorial-form';

vi.mock('@/modules/dashboard/components/editorial/rich-text-editor', () => ({
  RichTextEditor: ({
    onDocChange,
  }: {
    readonly onDocChange: (change: { readonly doc: unknown; readonly text: string }) => void;
  }) => (
    <textarea
      aria-label="Isi Artikel"
      onChange={(event) => {
        const text = event.target.value;
        onDocChange({
          doc: {
            type: 'doc',
            content:
              text.trim() === ''
                ? [{ type: 'paragraph' }]
                : [{ type: 'paragraph', content: [{ type: 'text', text }] }],
          },
          text,
        });
      }}
    />
  ),
}));

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

async function pilihWilayahWonosobo(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Wilayah'));
  await user.click(await screen.findByRole('option', { name: 'Wonosobo' }));
}

describe('Formulir tulis artikel', () => {
  it('merender panel artikel saja tanpa penyaluran', () => {
    setup({});
    expect(screen.getByText('Artikel baru')).toBeDefined();
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
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
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
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
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

  it('mengirim artikel baru sebagai draf', async () => {
    const { submit, container } = setup({});
    const titleInput = screen.getByLabelText('Judul Artikel');
    fireEvent.change(titleInput, { target: { value: 'Judul Uji' } });
    fireEvent.blur(titleInput);
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Judul Uji', slug: 'judul-uji', status: 'draft' }),
      ),
    );
  });

  it('merender composer dengan bilah aksi, rel atribusi, dan sumber', () => {
    setup({});
    expect(screen.getByRole('combobox', { name: 'Status artikel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Simpan Draf' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Atribusi' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Sumber' })).toBeDefined();
    expect(screen.queryByRole('region', { name: 'Terbitkan' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Topik' })).toBeNull();
    expect(screen.getByLabelText(/Topik \(koma, maks\. 10\)/)).toBeDefined();
    expect(screen.getByLabelText('Penulis')).toBeDefined();
    expect(screen.getByLabelText('Deskripsi')).toBeDefined();
    expect(screen.getByLabelText('URL Kanonis (opsional)')).toBeDefined();
  });

  it('mengirim deskripsi, kanonis, penulis, dan status draf', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.change(screen.getByLabelText('Deskripsi'), { target: { value: 'Inti berita.' } });
    fireEvent.change(screen.getByLabelText('URL Kanonis (opsional)'), { target: { value: 'https://sumber.example/rilis' } });
    await user.click(screen.getByLabelText('Penulis'));
    await user.click(await screen.findByRole('option', { name: 'Penulis Uji' }));
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
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
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
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
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
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
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: ['c-9'] })),
    );
  });

  it('mengirim URL sampul luar tanpa unggahan', async () => {
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.change(screen.getByLabelText(/URL gambar luar/), { target: { value: 'https://sumber.example/sampul.jpg' } });
    await pilihWilayahWonosobo();
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
      fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
      await pilihWilayahWonosobo();
      fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
      await waitFor(() =>
        expect(submit).toHaveBeenCalledWith(expect.objectContaining({ leadMediaId: 'm-1' })),
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('menampilkan pratinjau dan tautan setelah sampul diunggah', async () => {
    const putMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', putMock);
    try {
      const submit = vi.fn(async () => null);
      const cmd = vi.fn(async (action: string) => {
        if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { Authorization: 'sig' } } };
        if (action === 'media.complete') return { id: 'm-1' };
        if (action === 'media.read') return { url: 'https://r2.example/preview' };
        return {};
      });
      const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
      const file = new File(['isi-gambar'], 'sampul.png', { type: 'image/png' });
      const input = container.querySelector('input[data-testid="featured-file-input"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.read', { mediaId: 'm-1' }));
      expect(await screen.findByAltText('Pratinjau sampul.png')).toBeDefined();
      expect(screen.getByText('/api/network/media/m-1')).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('menyimpan metadata sampul lewat media.update', async () => {
    const putMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', putMock);
    try {
      const submit = vi.fn(async () => null);
      const cmd = vi.fn(async (action: string) => {
        if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { Authorization: 'sig' } } };
        if (action === 'media.complete') return { id: 'm-1', version: 1 };
        if (action === 'media.update') return { id: 'm-1', version: 2 };
        if (action === 'media.read') return { url: 'https://r2.example/preview' };
        return {};
      });
      const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
      const file = new File(['isi-gambar'], 'sampul.png', { type: 'image/png' });
      const input = container.querySelector('input[data-testid="featured-file-input"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.complete', { reservationId: 'res-1' }));
      fireEvent.change(screen.getByLabelText('Teks alt sampul'), { target: { value: 'Pasar pagi' } });
      fireEvent.change(screen.getByLabelText(/Keterangan sampul/), { target: { value: 'Suasana pasar' } });
      fireEvent.click(screen.getByRole('button', { name: 'Simpan metadata sampul' }));
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.update', { mediaId: 'm-1', expectedVersion: 1, altText: 'Pasar pagi', caption: 'Suasana pasar' }));
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('memilih titik fokus sampul dari klik pratinjau', async () => {
    const putMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', putMock);
    try {
      const submit = vi.fn(async () => null);
      const cmd = vi.fn(async (action: string) => {
        if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { Authorization: 'sig' } } };
        if (action === 'media.complete') return { id: 'm-1', version: 1 };
        if (action === 'media.update') return { id: 'm-1', version: 2 };
        if (action === 'media.read') return { url: 'https://r2.example/preview' };
        return {};
      });
      const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
      const file = new File(['isi-gambar'], 'sampul.png', { type: 'image/png' });
      const input = container.querySelector('input[data-testid="featured-file-input"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.complete', { reservationId: 'res-1' }));
      const picker = await screen.findByRole('button', { name: 'Pilih titik fokus sampul' });
      vi.spyOn(picker, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 100, x: 0, y: 0, right: 200, bottom: 100, toJSON: () => ({}) } as DOMRect);
      fireEvent.click(picker, { clientX: 60, clientY: 25 });
      await waitFor(() => expect(cmd).toHaveBeenCalledWith('media.update', expect.objectContaining({ mediaId: 'm-1', expectedVersion: 1, focalX: 30, focalY: 25 })));
      expect(await screen.findByText('Fokus 30%, 25% — klik lagi untuk mengubah.')).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('mengganti label tombol simpan mengikuti status', async () => {
    const user = userEvent.setup();
    setup({});
    expect(screen.getByRole('button', { name: 'Simpan Draf' })).toBeDefined();
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Siap Reviu' }));
    expect(screen.getByRole('button', { name: 'Simpan untuk Reviu' })).toBeDefined();
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terjadwal' }));
    expect(screen.getByRole('button', { name: 'Jadwalkan Terbit' })).toBeDefined();
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    expect(screen.getByRole('button', { name: 'Terbitkan Langsung' })).toBeDefined();
  });

  it('mengunci penulis ke penerbit dan menampilkan byline humas', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => null);
    const cmd = vi.fn(async () => ({}));
    const data = {
      ...DATA,
      authors: [{ id: 'r-1', displayName: 'Redaksi', byline: 'Tim Redaksi', status: 'active', version: 1 }],
      publishers: [{ id: 'p-1', name: 'Lapas Uji', attributionLabel: 'Humas Lapas Uji', status: 'active' }],
    };
    const { container } = render(<ArticleCreateForm data={data} onSubmit={submit} command={cmd} />);
    expect(await screen.findByText('Yang tampil: Tim Redaksi.')).toBeDefined();
    await user.click(screen.getByLabelText('Penerbit'));
    await user.click(await screen.findByRole('option', { name: 'Lapas Uji' }));
    expect((screen.getByLabelText('Penulis') as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Yang tampil: Humas Lapas Uji (mengikuti penerbit).')).toBeDefined();
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ publisherId: 'p-1', authorId: null }),
      ),
    );
  });

  it('mengisi Redaksi otomatis saat penerbit dikosongkan', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => null);
    const cmd = vi.fn(async () => ({}));
    const data = {
      ...DATA,
      authors: [{ id: 'r-1', displayName: 'Redaksi', byline: 'Tim Redaksi', status: 'active', version: 1 }],
      publishers: [{ id: 'p-1', name: 'Lapas Uji', attributionLabel: 'Humas Lapas Uji', status: 'active' }],
    };
    render(<ArticleCreateForm data={data} onSubmit={submit} command={cmd} />);
    await user.click(screen.getByLabelText('Penerbit'));
    await user.click(await screen.findByRole('option', { name: 'Lapas Uji' }));
    expect((screen.getByLabelText('Penulis') as HTMLInputElement).disabled).toBe(true);
    await user.click(screen.getByLabelText('Penerbit'));
    await user.click(await screen.findByRole('option', { name: 'Mandiri (tanpa penerbit)' }));
    expect((screen.getByLabelText('Penulis') as HTMLInputElement).disabled).toBe(false);
    expect(await screen.findByText('Yang tampil: Tim Redaksi.')).toBeDefined();
  });

  it('menampilkan sumber teks polos di tab Sumber', async () => {
    const user = userEvent.setup();
    const cmd = vi.fn(async () => ({}));
    render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={cmd} />);
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi untuk sumber.' } });
    await user.click(screen.getByRole('tab', { name: 'Sumber' }));
    expect(screen.getByText('Isi untuk sumber.')).toBeDefined();
    expect(screen.getByText(/Struktur JSON valid/)).toBeDefined();
  });

  it('menampilkan pratinjau judul dan isi di tab Pratinjau', async () => {
    const user = userEvent.setup();
    const cmd = vi.fn(async () => ({}));
    render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={cmd} />);
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Pratinjau' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi untuk pratinjau.' } });
    await user.click(screen.getByRole('tab', { name: 'Pratinjau' }));
    expect(await screen.findByRole('heading', { name: 'Judul Pratinjau' })).toBeDefined();
    expect(screen.getByText('Isi untuk pratinjau.')).toBeDefined();
  });

  it('menolak simpan saat isi artikel kosong', async () => {
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });

  it('menampilkan statistik artikel lengkap di bawah editor', () => {
    setup({});
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'satu dua tiga empat' } });
    const stats = screen.getByLabelText('Statistik artikel');
    expect(within(stats).getByText(/4 kata/)).toBeDefined();
    expect(within(stats).getByText(/19 karakter/)).toBeDefined();
    expect(within(stats).getByText(/1 paragraf/)).toBeDefined();
    expect(within(stats).getByText(/0 gambar/)).toBeDefined();
    expect(within(stats).getByText(/0 sematan/)).toBeDefined();
    expect(within(stats).getByText(/1 mnt baca/)).toBeDefined();
    expect((screen.getByRole('combobox', { name: 'Status artikel' }) as HTMLInputElement).value).toBe('Draf');
  });

  it('menolak status terjadwal tanpa jadwal terbit', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terjadwal' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });

  it('mengirim status terjadwal beserta jadwal terbit', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terjadwal' }));
    fireEvent.change(screen.getByLabelText('Jadwal terbit'), { target: { value: '2026-09-23T10:00' } });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scheduled', scheduledAt: new Date('2026-09-23T10:00').toISOString() }),
      ),
    );
  });

  it('slug mengikuti judul kata per kata sampai disentuh manual', async () => {
    const user = userEvent.setup();
    setup({});
    const title = screen.getByLabelText('Judul Artikel') as HTMLInputElement;
    const slug = screen.getByLabelText('Slug URL') as HTMLInputElement;
    await user.type(title, 'Banjir');
    expect(slug.value).toBe('banjir');
    await user.type(title, ' Wonosobo');
    expect(slug.value).toBe('banjir-wonosobo');
    await user.clear(slug);
    await user.type(slug, 'banjir-custom');
    await user.type(title, ' 2026');
    expect(slug.value).toBe('banjir-custom');
  });
});
