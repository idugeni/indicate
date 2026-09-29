// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleCreateForm } from '@/modules/dashboard/components/editorial/editorial-form';

vi.mock('@/modules/dashboard/components/editorial/rich-text-editor', () => ({
  RichTextEditor: ({
    initialDoc,
    onDocChange,
  }: {
    readonly initialDoc?: unknown;
    readonly onDocChange: (change: { readonly doc: unknown; readonly text: string }) => void;
  }) => {
    const initial = initialDoc as { readonly content?: readonly { readonly content?: readonly { readonly text?: unknown }[] }[] } | null | undefined;
    const initialText = (initial?.content ?? [])
      .map((node) => (node.content ?? []).map((leaf) => (typeof leaf.text === 'string' ? leaf.text : '')).join(''))
      .join(' ');
    return (
      <textarea
        aria-label="Isi Artikel"
        defaultValue={initialText}
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
    );
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), promise: vi.fn((task: Promise<unknown>) => task) },
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
});

const DATA = {
  regions: [
    { id: 'r-1', name: 'Jawa Tengah', kind: 'region', parentRegionId: null },
    { id: 'r-2', name: 'Wonosobo', kind: 'city', parentRegionId: 'r-1' },
  ],
  publishers: [
    { id: 'p-1', name: 'Penerbit Uji', status: 'active' },
    { id: 'p-2', name: 'Penerbit Arsip', status: 'archived' },
  ],
  categories: [
    { id: 'c-0', name: 'Berita', slug: 'berita', status: 'active' },
    { id: 'c-1', name: 'Politik', slug: 'politik', status: 'active' },
    { id: 'c-2', name: 'Ekonomi', slug: 'ekonomi', status: 'active' },
    { id: 'c-3', name: 'Arsip Lama', slug: 'arsip-lama', status: 'archived' },
  ],
  authors: [{ id: 'a-1', displayName: 'Penulis Uji' }],
  articles: [{ id: 'art-1', title: 'Artikel Uji' }],
  sites: [
    { id: 's-apex-1', siteLevel: 'apex', status: 'active', activationState: 'active', regionId: null },
    { id: 's-apex-2', siteLevel: 'apex', status: 'active', activationState: 'active', regionId: null },
    { id: 's-region-1', siteLevel: 'region', status: 'active', activationState: 'active', regionId: 'r-1' },
    { id: 's-city-1', siteLevel: 'city', status: 'active', activationState: 'active', regionId: 'r-2' },
    { id: 's-dead-1', siteLevel: 'apex', status: 'retired', activationState: 'active', regionId: null },
  ],
};

function setup(overrides: {
  submit?: (payload: unknown) => Promise<unknown>;
  command?: (action: string, payload: unknown) => Promise<unknown>;
  organizationId?: string;
}) {
  const submit = vi.fn(async (payload: unknown) => (overrides.submit ? overrides.submit(payload) : null));
  const cmd = vi.fn(async (action: string, payload: unknown) => {
    if (overrides.command !== undefined) return overrides.command(action, payload);
    if (action !== 'publication.suggest') return {};
    const { siteIds } = payload as { readonly siteIds: readonly string[] };
    return {
      overrides: Object.fromEntries(
        siteIds.map((siteId, index) => [siteId, { title: `Judul portal ${index}`, description: `Deskripsi portal ${index}.` }]),
      ),
    };
  });
  const { container, unmount } = render(
    <ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} organizationId={overrides.organizationId} />,
  );
  return { submit, cmd, container, unmount };
}

async function pilihWilayahWonosobo(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Wilayah'));
  await user.click(await screen.findByRole('option', { name: 'Jawa Tengah' }));
  await user.click(screen.getByLabelText('Kota / kabupaten'));
  await user.click(await screen.findByRole('option', { name: 'Wonosobo' }));
}

async function pilihWilayahSaja(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Wilayah'));
  await user.click(await screen.findByRole('option', { name: 'Jawa Tengah' }));
}

describe('Formulir tulis artikel', () => {
  it('merender panel artikel saja tanpa penyaluran', () => {
    setup({});
    expect(screen.getByText('Artikel baru')).toBeDefined();
    expect(screen.queryByText('Penyaluran Artikel')).toBeNull();
    expect(screen.queryByText('Pilih Artikel Target')).toBeNull();
    expect(screen.getByRole('button', { name: /simpan draf/i })).toBeDefined();
  });

  it('menampilkan kota hanya setelah wilayah dipilih dan mengirim id kota', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({});
    expect(screen.queryByLabelText('Kota / kabupaten')).toBeNull();

    await user.click(screen.getByLabelText('Wilayah'));
    await user.click(await screen.findByRole('option', { name: 'Jawa Tengah' }));
    expect(screen.getByLabelText('Kota / kabupaten')).toBeDefined();

    await user.click(screen.getByLabelText('Kota / kabupaten'));
    await user.click(await screen.findByRole('option', { name: 'Wonosobo' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ regionId: 'r-2' })));
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
          scheduledAt: null,
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

  it('mengirim kategori berita saat tidak ada yang dipilih', async () => {
    const { submit, container } = setup({});
    expect(screen.getByLabelText(/Kategori \(1 dipilih · Berita\)/)).toBeDefined();
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: ['c-0'] })));
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

  it('menunda kategori baru ke server sampai artikel disimpan', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => null);
    const cmd = vi.fn(async (action: string) => (action === 'category.create' ? { id: 'c-9' } : {}));
    const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
    await user.click(screen.getByLabelText(/Kategori/));
    await user.type(screen.getByLabelText(/Kategori/), 'Olahraga');
    await waitFor(() => expect(screen.queryByRole('option')).toBeNull());
    await user.click(screen.getByRole('button', { name: /Tambah.*Olahraga.*kategori baru/ }));
    await waitFor(() => expect(screen.getByText('Olahraga')).toBeDefined());
    expect(cmd).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith('category.create', { name: 'Olahraga', slug: 'olahraga' }),
    );
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: ['c-9'] })),
    );
  });

  it('menahan artikel saat kategori baru gagal dibuat', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => null);
    const cmd = vi.fn(async () => null);
    const { container } = render(<ArticleCreateForm data={DATA} onSubmit={submit} command={cmd} />);
    await user.click(screen.getByLabelText(/Kategori/));
    await user.type(screen.getByLabelText(/Kategori/), 'Olahraga');
    await user.click(await screen.findByRole('button', { name: /Tambah.*Olahraga.*kategori baru/ }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(cmd).toHaveBeenCalledWith('category.create', { name: 'Olahraga', slug: 'olahraga' }));
    expect(submit).not.toHaveBeenCalled();
  });

  it('menyimpan artikel tanpa sumber', async () => {
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ source: '' })));
  });

  it('menolak simpan dan menampilkan pesan Indonesia saat isi kaya tidak valid', async () => {
    const { submit, container } = setup({});
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    await act(async () => {
      screen.getByLabelText('Isi Artikel').dispatchEvent(new Event('change', { bubbles: true }));
    });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).not.toHaveBeenCalled());
  });

  it('menulis draft ke localStorage lalu memulihkannya saat form dibuka lagi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const first = setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Belum Selesai' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Kantor' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Paragraf yang belum rampung.' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    const stored = window.localStorage.getItem('indicate:article-draft:org-1');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toMatchObject({ titleText: 'Belum Selesai', source: 'Rilis Kantor' });
    first.unmount();

    render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={vi.fn(async () => ({}))} organizationId="org-1" />);
    expect((screen.getByLabelText('Judul Artikel') as HTMLInputElement).value).toBe('Belum Selesai');
    expect((screen.getByLabelText('Sumber', { selector: 'input' }) as HTMLInputElement).value).toBe('Rilis Kantor');
    expect((screen.getByLabelText('Isi Artikel') as HTMLTextAreaElement).value).toBe('Paragraf yang belum rampung.');
  });

  it('tidak menulis draft milik tenant lain', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Rahasia Tenant' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi.' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(window.localStorage.getItem('indicate:article-draft:org-1')).not.toBeNull();
    expect(window.localStorage.getItem('indicate:article-draft:org-2')).toBeNull();
  });

  it('menghapus draft setelah artikel tersimpan', async () => {
    const { container } = setup({ organizationId: 'org-1', submit: async () => ({ id: 'art-1', slug: 'judul-uji' }) });
    await pilihWilayahWonosobo();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
    expect(window.localStorage.getItem('indicate:article-draft:org-1')).not.toBeNull();
    await act(async () => {
      fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
      await vi.advanceTimersByTimeAsync(1_500);
    });
    expect(window.localStorage.getItem('indicate:article-draft:org-1')).toBeNull();
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
    expect(screen.getByRole('button', { name: 'Jadwalkan dan Terbitkan' })).toBeDefined();
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    expect(screen.getByRole('button', { name: 'Simpan dan Terbitkan' })).toBeDefined();
  });

  it('menampilkan label simpan biasa saat tayang otomatis dimatikan', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByRole('checkbox', { name: /Tayang otomatis/ }));
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    expect(screen.getByRole('button', { name: 'Terbitkan Langsung' })).toBeDefined();
    expect(screen.queryByText(/portal$/)).toBe(null);
  });

  it('menyorot portal apex sebagai target saat kota belum dipilih', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    expect(screen.getByText('2 portal apex')).toBeDefined();
  });

  it('berpindah ke portal kota terpilih begitu kota dipilih', async () => {
    const user = userEvent.setup();
    setup({});
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    expect(screen.getByText('2 portal apex')).toBeDefined();
    await pilihWilayahWonosobo();
    expect(screen.getByText('1 portal kota Wonosobo')).toBeDefined();
    expect(screen.queryByText('2 portal apex')).toBe(null);
  });

  it('menayangkan artikel tersimpan lewat satu formulir dengan varian unik per portal', async () => {
    const user = userEvent.setup();
    const { cmd, container } = setup({ submit: async () => ({ id: 'art-baru', slug: 'judul-uji' }) });
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith(
        'publication.suggest',
        expect.objectContaining({ articleId: 'art-baru', siteIds: ['s-city-1'] }),
      ),
    );
    const request = cmd.mock.calls.find(([action]) => action === 'publication.request');
    expect(request?.[1]).toEqual(expect.objectContaining({
      articleId: 'art-baru',
      siteIds: ['s-city-1'],
      options: { mode: 'immediate' },
      overrides: {
        's-city-1': { title: 'Judul portal 0', description: 'Deskripsi portal 0.' },
      },
    }));
  });

  it('memecah penerbitan mengikuti jumlah apex portal yang tersedia', async () => {
    const user = userEvent.setup();
    const apexSites = Array.from({ length: 134 }, (_, index) => ({ id: `apex-${index}`, siteLevel: 'apex', status: 'active', activationState: 'active' }));
    const seen: number[] = [];
    const { container } = render(
      <ArticleCreateForm
        data={{ ...DATA, sites: apexSites }}
        onSubmit={async () => ({ id: 'art-besar', slug: 'judul-uji' })}
        command={async (action, payload) => {
          const { siteIds } = payload as { readonly siteIds: readonly string[] };
          if (action === 'publication.suggest') {
            seen.push(siteIds.length);
            return { overrides: Object.fromEntries(siteIds.map((id) => [id, { title: `T${id}`, description: `D${id} yang berbeda.` }])) };
          }
          return {};
        }}
      />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahSaja();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(seen.length).toBe(2));
    expect(seen).toEqual([100, 34]);
  });

  it('menahan penerbitan bila varian portal tidak lengkap', async () => {
    const user = userEvent.setup();
    const cmd = vi.fn(async (action: string) => (action === 'publication.suggest' ? { overrides: {} } : {}));
    const { container } = render(
      <ArticleCreateForm data={DATA} onSubmit={async () => ({ id: 'art-var', slug: 'judul-uji' })} command={cmd} />,
    );
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(screen.queryByText(/gagal ditayangkan/)).toBeDefined());
    expect(cmd.mock.calls.some(([action]) => action === 'publication.request')).toBe(false);
  });

  it('tidak menayangkan draf meski tayang otomatis nyala', async () => {
    const { cmd, container } = setup({ submit: async () => ({ id: 'art-draf', slug: 'judul-uji' }) });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(cmd).not.toHaveBeenCalledWith('publication.request', expect.anything()),
    );
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
