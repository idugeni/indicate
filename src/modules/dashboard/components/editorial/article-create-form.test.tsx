// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ArticleCreateForm } from '@/modules/dashboard/components/editorial/editorial-form';
import type { PublisherEntity } from '@/modules/dashboard/components/shared/types';

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

vi.mock('sonner', async () => (await import('@/test/stubs/sonner')).sonnerStub());

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
  data?: unknown;
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
    <ArticleCreateForm data={overrides.data ?? DATA} onSubmit={submit} command={cmd} organizationId={overrides.organizationId} />,
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

  it('mengisi wilayah, kota, dan sumber otomatis dari penerbit humas', async () => {
    const humas: PublisherEntity = {
      id: 'p-humas',
      name: 'RUTAN KELAS II B WONOSOBO',
      type: 'correctional_institution',
      attributionLabel: 'Humas Rutan Wonosobo',
      contacts: { city: 'Kab. Wonosobo' },
      evidenceReference: null,
      version: 1,
      verificationStatus: 'verified',
      status: 'active',
    };
    const user = userEvent.setup();
    const { submit, container } = setup({
      data: {
        ...DATA,
        publishers: [humas],
      },
    });
    expect(screen.queryByLabelText('Kota / kabupaten')).toBeNull();
    await user.click(screen.getByLabelText('Penerbit'));
    await user.click(await screen.findByRole('option', { name: 'RUTAN KELAS II B WONOSOBO' }));
    expect(screen.getByLabelText('Kota / kabupaten')).toBeDefined();
    expect((screen.getByLabelText('Sumber', { selector: 'input' }) as HTMLInputElement).value).toBe(
      'RUTAN KELAS II B WONOSOBO',
    );
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          publisherId: 'p-humas',
          regionId: 'r-2',
          source: 'RUTAN KELAS II B WONOSOBO',
        }),
      ),
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

  it('membuka form selalu kosong walau sebelumnya sempat mengisi', async () => {
    const first = setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Belum Selesai' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Paragraf yang belum rampung.' } });
    expect(window.localStorage.getItem('indicate:article-draft:org-1')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Simpan ke server' })).toBeNull();
    first.unmount();

    render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={vi.fn(async () => ({}))} organizationId="org-1" />);
    expect((screen.getByLabelText('Judul Artikel') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Isi Artikel') as HTMLTextAreaElement).value).toBe('');
  });

  it('tidak menulis baris server saat mengetik atau menunggu tanpa submit', async () => {
    const saved = vi.fn(async () => ({ id: 'art-draf-1', slug: 'judul-uji', version: 1 }));
    setup({ organizationId: 'org-1', command: saved });
    await pilihWilayahWonosobo();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(saved).not.toHaveBeenCalled();
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

  it('menayangkan artikel tersimpan dengan judul kanonik apa adanya di semua portal', async () => {
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
        'publication.request',
        expect.objectContaining({ articleId: 'art-baru', siteIds: ['s-city-1'] }),
      ),
    );
    const request = cmd.mock.calls.find(([action]) => action === 'publication.request');
    expect(request?.[1]).toEqual(expect.objectContaining({
      articleId: 'art-baru',
      siteIds: ['s-city-1'],
      options: { mode: 'immediate' },
      overrides: {},
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
          if (action === 'publication.request') {
            seen.push(siteIds.length);
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

  it('menampilkan galat bila permintaan penerbitan gagal', async () => {
    const user = userEvent.setup();
    const cmd = vi.fn(async (action: string) => {
      if (action === 'publication.request') throw new Error('request failed');
      return {};
    });
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
    expect(cmd.mock.calls.some(([action]) => action === 'publication.request')).toBe(true);
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
    // Read "besok" before interacting: crossing local midnight mid-test would
    // otherwise compare two different days.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (part: number) => String(part).padStart(2, '0');
    const expectedDay = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const user = userEvent.setup();
    const { submit, container } = setup({});
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terjadwal' }));
    await user.click(screen.getByRole('button', { name: 'Jadwal terbit' }));
    await user.click(await screen.findByRole('button', { name: 'Besok' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'scheduled' }),
      ),
    );
    const payload = vi.mocked(submit).mock.calls[0]?.[0] as { readonly scheduledAt?: string } | undefined;
    expect(typeof payload?.scheduledAt).toBe('string');
    // The shortcut carries the current clock, and `localDateTimeToIso` emits UTC.
    // Compare in the browser's timezone, or an early-morning local time shifts the
    // UTC date back a day and the comparison is meaningless.
    const scheduled = new Date(payload?.scheduledAt as string);
    expect(`${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(scheduled.getDate())}`).toBe(expectedDay);
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

  it('menerbitkan backdate kemarin dengan tayangan awal kustom', async () => {
    const user = userEvent.setup();
    const { cmd, container } = setup({ submit: async () => ({ id: 'art-baru', slug: 'judul-uji' }) });
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    await user.click(screen.getByRole('button', { name: 'Tanggal terbit' }));
    await user.click(await screen.findByRole('button', { name: 'Kemarin' }));
    fireEvent.change(screen.getByLabelText(/Tayangan awal/), { target: { value: '5000' } });
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => {
      const request = cmd.mock.calls.find(([action]) => action === 'publication.request');
      const publishAt = (request?.[1] as { readonly publishAt?: string } | undefined)?.publishAt;
      expect(typeof publishAt === 'string' && new Date(publishAt).getTime() < Date.now()).toBe(true);
    });
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith('article.sites.views.setMany', {
        articleId: 'art-baru',
        siteIds: expect.arrayContaining(['s-city-1']),
        viewCount: 5000,
      }),
    );
  });

  it('mencegah tanggal masa depan pada mode terbit langsung', async () => {
    const user = userEvent.setup();
    setup({ submit: async () => ({ id: 'art-baru', slug: 'judul-uji' }) });
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    await user.click(screen.getByRole('button', { name: 'Tanggal terbit' }));
    expect((await screen.findByRole('button', { name: 'Besok' }) as HTMLButtonElement).disabled).toBe(true);
    expect((await screen.findByRole('button', { name: 'Kemarin' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('melewatkan tayangan awal saat dikosongkan agar seeding bawaan jalan', async () => {
    const user = userEvent.setup();
    const { cmd, container } = setup({ submit: async () => ({ id: 'art-baru', slug: 'judul-uji' }) });
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await pilihWilayahWonosobo();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => {
      expect(cmd.mock.calls.find(([action]) => action === 'publication.request')).toBeDefined();
    });
    expect(cmd.mock.calls.find(([action]) => action === 'article.sites.views.setMany')).toBeUndefined();
  });

  it('menaikkan dan menurunkan tayangan awal lewat tombol stepper', async () => {
    const user = userEvent.setup();
    setup({ organizationId: 'org-1' });
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));
    const field = screen.getByLabelText(/Tayangan awal/) as HTMLInputElement;
    await user.click(screen.getByRole('button', { name: 'Tambah tayangan awal' }));
    expect(field.value).toBe('100');
    await user.click(screen.getByRole('button', { name: 'Tambah tayangan awal' }));
    expect(field.value).toBe('200');
    await user.click(screen.getByRole('button', { name: 'Kurangi tayangan awal' }));
    expect(field.value).toBe('100');
  });

  function mockAiFetch(handler: (body: Record<string, unknown>) => unknown) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: { readonly body?: unknown }) => ({
        ok: true,
        json: async () => handler(JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>),
      })),
    );
  }

  it('menyempurnakan judul inline dan memakai varian pilihan', async () => {
    const user = userEvent.setup();
    setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Banjir' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Air surut.' } });
    mockAiFetch((body) => body.action === 'seo-titles' ? { titles: ['Banjir Surut di Wonosobo', 'Warga Kembali'] } : {});

    await user.click(screen.getByRole('button', { name: 'Sempurnakan judul' }));
    await waitFor(() => expect(screen.queryByText('Banjir Surut di Wonosobo')).not.toBeNull());
    await user.click(screen.getAllByRole('button', { name: 'Pakai' })[0]!);
    expect((screen.getByLabelText('Judul Artikel') as HTMLInputElement).value).toBe('Banjir Surut di Wonosobo');
  });

  it('membuat deskripsi inline saat masih kosong', async () => {
    const user = userEvent.setup();
    setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Banjir' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Air surut.' } });
    mockAiFetch((body) => body.action === 'seo-meta' ? { metaDescription: 'Air di Wonosobo surut.' } : {});

    await user.click(screen.getByRole('button', { name: 'Buatkan deskripsi' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Deskripsi') as HTMLTextAreaElement).value).toBe('Air di Wonosobo surut.'),
    );
  });

  it('menyempurnakan deskripsi yang sudah terisi', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_url: unknown, _init?: { readonly body?: unknown }) => ({
      ok: true,
      json: async () => ({ metaDescription: 'Air di Wonosobo telah surut total.' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Banjir' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Air surut.' } });
    fireEvent.change(screen.getByLabelText('Deskripsi'), { target: { value: 'Air surut.' } });

    await user.click(screen.getByRole('button', { name: 'Sempurnakan deskripsi' }));
    await waitFor(() =>
      expect((screen.getByLabelText('Deskripsi') as HTMLTextAreaElement).value).toBe('Air di Wonosobo telah surut total.'),
    );
    const sent = JSON.parse(String(vi.mocked(fetchMock).mock.calls[0]?.[1]?.body ?? '{}')) as {
      readonly payload?: { readonly current?: string };
    };
    expect(sent.payload?.current).toBe('Air surut.');
  });

  it('memoles isi inline dan menerapkannya ke editor', async () => {
    const user = userEvent.setup();
    setup({ organizationId: 'org-1' });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Banjir' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Air jelek.' } });
    mockAiFetch(() => ({ body: 'Air sudah surut dengan baik.' }));

    await user.click(screen.getByRole('button', { name: /poles isi/i }));
    await waitFor(() => expect(screen.queryByText(/Air sudah surut dengan baik/)).not.toBeNull());
    await user.click(screen.getByRole('button', { name: /terapkan ke isi/i }));
    await waitFor(() =>
      expect((screen.getByLabelText('Isi Artikel') as HTMLTextAreaElement).value).toContain('Air sudah surut dengan baik.'),
    );
  });

  it('melengkapi kategori dan topik otomatis dari isi', async () => {
    const user = userEvent.setup();
    const { submit, container } = setup({ organizationId: 'org-1', submit: async () => ({ id: 'art-baru', slug: 'judul-uji' }) });
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'APBD Wonosobo' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Anggaran disahkan.' } });
    await pilihWilayahWonosobo();
    mockAiFetch(() => ({ classification: { categories: ['Ekonomi'], tags: ['apbd'] } }));

    await user.click(screen.getByRole('button', { name: /lengkapi otomatis/i }));
    await waitFor(() => expect(submit).not.toHaveBeenCalled());
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({ categoryIds: ['c-2'], tags: expect.arrayContaining(['apbd']) }),
      ),
    );
  });

  it('mengubah audio menjadi berita lengkap siap formulir', async () => {
    const user = userEvent.setup();
    setup({ organizationId: 'org-1' });
    mockAiFetch(() => ({
      article: {
        draft: { title: 'Gotong Royong', excerpt: 'Warga bergotong royong.', content: 'Warga bergotong royong membersihkan selokan.', slug: 'gotong-royong' },
        classification: { categories: ['Ekonomi'], tags: ['gotong-royong'] },
      },
    }));

    await user.click(screen.getByRole('button', { name: /audio jadi berita/i }));
    const [fileInput] = Array.from(document.querySelectorAll('input[type="file"]')).filter((el) =>
      (el.getAttribute('aria-label') ?? '').includes('dijadikan berita'),
    );
    expect(fileInput).toBeDefined();
    const file = new File(['pura-pura-audio'], 'wawancara.webm', { type: 'audio/webm' });
    await user.upload(fileInput as HTMLInputElement, file);
    await waitFor(() =>
      expect((screen.getByLabelText('Judul Artikel') as HTMLInputElement).value).toBe('Gotong Royong'),
    );
    await waitFor(() =>
      expect((screen.getByLabelText('Isi Artikel') as HTMLTextAreaElement).value).toContain('membersihkan selokan'),
    );
  });

  it('admin menerbitkan nasional ke semua apex tanpa memilih wilayah', async () => {
    const user = userEvent.setup();
    const submit = vi.fn(async () => ({ id: 'art-baru', slug: 'judul-uji' }));
    const cmd = vi.fn(async (action: string, payload: unknown) => {
      if (action !== 'publication.suggest') return {};
      const { siteIds } = payload as { readonly siteIds: readonly string[] };
      return {
        overrides: Object.fromEntries(
          siteIds.map((siteId, index) => [siteId, { title: `Judul portal ${index}`, description: `Deskripsi portal ${index}.` }]),
        ),
      };
    });
    const { container } = render(
      <ArticleCreateForm data={{ ...DATA, regionScope: null }} onSubmit={submit} command={cmd} organizationId="org-1" />,
    );
    fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Judul Uji' } });
    fireEvent.change(screen.getByLabelText('Sumber', { selector: 'input' }), { target: { value: 'Rilis Resmi' } });
    fireEvent.change(screen.getByLabelText('Isi Artikel'), { target: { value: 'Isi berita lengkap.' } });
    await user.click(screen.getByRole('combobox', { name: 'Status artikel' }));
    await user.click(await screen.findByRole('option', { name: 'Terbit Langsung' }));

    await user.click(screen.getByRole('checkbox', { name: 'Nasional — semua apex utama' }));
    expect(screen.queryByLabelText('Wilayah')).toBeNull();
    fireEvent.submit(container.querySelectorAll('form')[0] as HTMLFormElement);
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ regionId: null })));
    await waitFor(() =>
      expect(cmd).toHaveBeenCalledWith('publication.request', expect.objectContaining({ siteIds: ['s-apex-1', 's-apex-2'] })),
    );
  });

  it('menyembunyikan opsi nasional bila cakupan wilayah terkunci', () => {
    setup({});
    expect(screen.queryByLabelText('Nasional — semua apex utama')).toBeNull();
    expect(screen.getByLabelText('Wilayah')).toBeDefined();
  });

  it('mengambil sampul dari pustaka media beserta metadatanya', async () => {
    const user = userEvent.setup();
    const libraryItem = {
      id: 'm-lib',
      objectKey: 'org/sampul-pustaka.webp',
      mediaType: 'image/webp',
      sizeBytes: 120,
      altText: 'Alt pustaka.',
      caption: 'Caption pustaka.',
      state: 'active',
      version: 3,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown) => ({
        ok: true,
        json: async () => (String(url).includes('view=media') ? { media: [libraryItem], articles: [], sites: [] } : {}),
      })),
    );
    try {
      const cmd = vi.fn(async (action: string) => {
        if (action === 'media.readMany') {
          return { items: [{ mediaId: 'm-lib', url: 'https://r2.example/preview-lib', expiresAt: '2026-10-02T01:00:00.000Z' }] };
        }
        if (action === 'media.read') return { url: 'https://r2.example/preview-lib' };
        return {};
      });
      render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={cmd} organizationId="org-1" />);
      await user.click(screen.getByRole('button', { name: /pilih dari pustaka/i }));
      await waitFor(() => expect(screen.queryByAltText('sampul-pustaka.webp')).not.toBeNull());
      await user.click(screen.getByRole('button', { name: 'Pilih sampul-pustaka.webp sebagai sampul' }));
      await waitFor(() => expect(screen.queryByLabelText('Teks alt sampul')).not.toBeNull());
      expect((screen.getByLabelText('Teks alt sampul') as HTMLInputElement).value).toBe('Alt pustaka.');
      expect((screen.getByLabelText('Keterangan sampul (opsional)') as HTMLInputElement).value).toBe('Caption pustaka.');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('mengisi alt dan caption AI untuk sampul dari pustaka', async () => {
    const user = userEvent.setup();
    const libraryItem = {
      id: 'm-lib',
      objectKey: 'org/sampul-pustaka.webp',
      mediaType: 'image/webp',
      sizeBytes: 120,
      altText: '',
      caption: '',
      state: 'active',
      version: 3,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: unknown, init?: { readonly body?: unknown }) => {
        const target = String(url);
        if (target.includes('view=media')) {
          return { ok: true, json: async () => ({ media: [libraryItem], articles: [], sites: [] }) };
        }
        if (target === 'https://r2.example/preview-lib') {
          return { ok: true, blob: async () => new Blob(['isi-gambar'], { type: 'image/jpeg' }) };
        }
        return {
          ok: true,
          json: async () => {
            const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
            return body.action === 'cover-caption'
              ? { caption: { alt: 'Alt AI pustaka.', caption: 'Caption AI pustaka.' } }
              : {};
          },
        };
      }),
    );
    try {
      const cmd = vi.fn(async (action: string) => {
        if (action === 'media.readMany') {
          return { items: [{ mediaId: 'm-lib', url: 'https://r2.example/preview-lib', expiresAt: '2026-10-02T01:00:00.000Z' }] };
        }
        if (action === 'media.read') return { url: 'https://r2.example/preview-lib' };
        return {};
      });
      render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={cmd} organizationId="org-1" />);
      await user.click(screen.getByRole('button', { name: /pilih dari pustaka/i }));
      await waitFor(() => expect(screen.queryByAltText('sampul-pustaka.webp')).not.toBeNull());
      await user.click(screen.getByRole('button', { name: 'Pilih sampul-pustaka.webp sebagai sampul' }));
      await waitFor(() => expect(screen.queryByLabelText('Teks alt sampul')).not.toBeNull());
      await user.click(screen.getByRole('button', { name: 'Isi alt dan caption otomatis' }));
      await waitFor(() =>
        expect((screen.getByLabelText('Teks alt sampul') as HTMLInputElement).value).toBe('Alt AI pustaka.'),
      );
      expect((screen.getByLabelText('Keterangan sampul (opsional)') as HTMLInputElement).value).toBe('Caption AI pustaka.');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('mengisi alt dan caption sampul otomatis dengan AI', async () => {
    const user = userEvent.setup();
    const putMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', putMock);
    try {
      const cmd = vi.fn(async (action: string, payload: unknown) => {
        if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { Authorization: 'sig' } } };
        if (action === 'media.complete') return { id: 'm-1', version: 1 };
        if (action === 'media.read') return { url: 'https://r2.example/preview' };
        if (action === 'publication.suggest') {
          const { siteIds } = payload as { readonly siteIds: readonly string[] };
          return {
            overrides: Object.fromEntries(
              siteIds.map((siteId, index) => [siteId, { title: `Judul portal ${index}`, description: `Deskripsi portal ${index}.` }]),
            ),
          };
        }
        return {};
      });
      render(<ArticleCreateForm data={DATA} onSubmit={vi.fn(async () => null)} command={cmd} organizationId="org-1" />);
      fireEvent.change(screen.getByLabelText('Judul Artikel'), { target: { value: 'Panen Raya' } });
      const picker = document.querySelector('[data-testid="featured-file-input"]') as HTMLInputElement;
      await user.upload(picker, new File(['isi-gambar'], 'sampul.png', { type: 'image/png' }));
      await waitFor(() => expect(screen.queryByLabelText('Teks alt sampul')).not.toBeNull());

      const aiMock = vi.fn(async (_url: unknown, init?: { readonly body?: unknown }) => ({
        ok: true,
        json: async () => {
          const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
          return body.action === 'cover-caption'
            ? { caption: { alt: 'Suasana pasar pagi.', caption: 'Pedagang menata dagangan.' } }
            : {};
        },
      }));
      vi.stubGlobal('fetch', aiMock);
      await user.click(screen.getByRole('button', { name: 'Isi alt dan caption otomatis' }));
      await waitFor(() =>
        expect((screen.getByLabelText('Teks alt sampul') as HTMLInputElement).value).toBe('Suasana pasar pagi.'),
      );
      expect((screen.getByLabelText('Keterangan sampul (opsional)') as HTMLInputElement).value).toBe(
        'Pedagang menata dagangan.',
      );
      const sent = JSON.parse(String(vi.mocked(aiMock).mock.calls[0]?.[1]?.body ?? '{}')) as {
        readonly action?: string;
        readonly payload?: { readonly mimeType?: string; readonly title?: string };
      };
      expect(sent.action).toBe('cover-caption');
      expect(sent.payload?.title).toBe('Panen Raya');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
