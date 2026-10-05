// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RichTextEditor, type RichTextDocChange } from '@/modules/dashboard/components/editorial/rich-text-editor';

vi.mock('@/modules/dashboard/components/editorial/editor-image-upload', () => ({
  uploadEditorImage: vi.fn(async (file: File) => {
    if (file.name.includes('gagal')) throw new Error('Gagal mengunggah. Periksa koneksi lalu coba lagi.');
    return {
      storedSrc: `/api/network/media/${file.name}`,
      previewUrl: `blob:pratinjau-${file.name}`,
      mediaId: file.name,
      version: 1,
      sizeBytes: 10,
      savingsBytes: 0,
      compressedBlob: file,
      compressedMediaType: 'image/webp',
    };
  }),
}));

function galleryImagesOf(changes: readonly RichTextDocChange[]): readonly unknown[] {
  const nodes = changes.flatMap((change) => change.doc.content ?? []);
  const gallery = nodes.find((node) => node.type === 'imageGallery');
  const images = gallery?.attrs?.images;
  return Array.isArray(images) ? images : [];
}

function imageFile(name: string, type = 'image/webp'): File {
  return new File(['isi'], name, { type });
}

afterEach(() => {
  cleanup();
});

describe('RichTextEditor', () => {
  it('merender toolbar berlabel, kanvas, dan status aksesibel', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.getByRole('toolbar', { name: 'Format teks' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tebal' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'H2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sisipkan gambar' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Advance' })).toBeDefined();
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('membuka format lanjutan berisi tombol enterprise: tabel, perataan, stabilo, garis', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Advance' }));
    expect(screen.getByRole('button', { name: 'Garis Bawah' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Kode Sebaris' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Stabilo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tengah' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Garis' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tabel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Hapus Tabel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sematan YouTube' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sematan sosial' })).toBeDefined();
    expect(screen.getByLabelText('Warna teks')).toBeDefined();
  });

  it('menyembunyikan panel keterangan sampai gambar diklik', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.queryByLabelText('Keterangan gambar')).toBeNull();
  });

  it('membuka panel URL gambar dari menu sisip gambar', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.queryByLabelText('URL gambar')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Sisipkan gambar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Dari URL luar' }));
    expect(screen.getByLabelText('URL gambar')).toBeDefined();
    expect(screen.getByLabelText(/Alt/)).toBeDefined();
  });

  it('menyediakan pemilih galeri multi-berkas hingga 4 gambar', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Sisipkan gambar' }));
    expect(screen.getByRole('menuitem', { name: 'Galeri hingga 4 gambar' })).toBeDefined();
    const picker = screen.getByLabelText('Pilih hingga 4 berkas gambar galeri') as HTMLInputElement;
    expect(picker.multiple).toBe(true);
    expect(picker.accept).toContain('image/webp');
  });

  it('membatasi galeri pada 4 gambar pertama dan memberi tahu sisanya', async () => {
    const changes: RichTextDocChange[] = [];
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={(change) => changes.push(change)} command={async () => null} labelledBy="body-label" />);
    const picker = screen.getByLabelText('Pilih hingga 4 berkas gambar galeri');
    await user.upload(picker, [1, 2, 3, 4, 5].map((n) => imageFile(`foto-${n}.webp`)));
    await waitFor(() => expect(screen.getByRole('status').textContent ?? '').toContain('1 gambar diabaikan'));
    expect(galleryImagesOf(changes)).toHaveLength(4);
  });

  it('tetap menyisipkan gambar yang berhasil bila sebagian gagal', async () => {
    const changes: RichTextDocChange[] = [];
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={(change) => changes.push(change)} command={async () => null} labelledBy="body-label" />);
    const picker = screen.getByLabelText('Pilih hingga 4 berkas gambar galeri');
    await user.upload(picker, [imageFile('lolos.webp'), imageFile('gagal-putus.webp')]);
    await waitFor(() => expect(screen.getByRole('status').textContent ?? '').toContain('1 gagal'));
    expect(galleryImagesOf(changes)).toHaveLength(1);
  });

  it('melaporkan tiap unggahan galeri yang tersimpan beserta org-nya', async () => {
    const stored: { readonly mediaId: string; readonly ownerOrganizationId: string | null }[] = [];
    const user = userEvent.setup();
    render(
      <RichTextEditor
        onDocChange={() => {}}
        command={async () => null}
        labelledBy="body-label"
        onImageStored={(mediaId, ownerOrganizationId) => stored.push({ mediaId, ownerOrganizationId })}
      />,
    );
    const picker = screen.getByLabelText('Pilih hingga 4 berkas gambar galeri');
    await user.upload(picker, [imageFile('lolos.webp'), imageFile('gagal-putus.webp')]);
    await waitFor(() => expect(screen.getByRole('status').textContent ?? '').toContain('1 gagal'));
    expect(stored).toEqual([{ mediaId: 'lolos.webp', ownerOrganizationId: null }]);
  });

  it('menolak galeri tanpa berkas gambar valid', async () => {
    const changes: RichTextDocChange[] = [];
    render(<RichTextEditor onDocChange={(change) => changes.push(change)} command={async () => null} labelledBy="body-label" />);
    const picker = screen.getByLabelText('Pilih hingga 4 berkas gambar galeri');
    fireEvent.change(picker, { target: { files: [new File(['x'], 'dokumen.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(screen.getByRole('status').textContent ?? '').toContain('dibatalkan'));
    expect(galleryImagesOf(changes)).toHaveLength(0);
  });

  it('menolak URL gambar yang tidak aman', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Sisipkan gambar' }));
    await user.click(screen.getByRole('menuitem', { name: 'Dari URL luar' }));
    await user.type(screen.getByLabelText('URL gambar'), 'notaurl');
    await user.click(screen.getByRole('button', { name: 'Sisipkan' }));
    expect(screen.getByRole('status').textContent ?? '').toContain('tidak valid');
  });

  it('hanya membuka satu panel semat dalam satu waktu', async () => {
    const user = userEvent.setup();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    await user.click(screen.getByRole('button', { name: 'Advance' }));
    await user.click(screen.getByRole('button', { name: 'Sematan YouTube' }));
    expect(screen.getByLabelText('URL/ID YouTube')).toBeDefined();
    await user.click(screen.getByRole('button', { name: 'Sematan sosial' }));
    expect(screen.getByLabelText('URL postingan sosial')).toBeDefined();
    expect(screen.queryByLabelText('URL/ID YouTube')).toBeNull();
  });

  it('menonaktifkan toolbar saat disabled', () => {
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} disabled />);
    expect(screen.getByRole('button', { name: 'Tebal' }).hasAttribute('disabled')).toBe(true);
  });

  it('menampilkan tombol poles di toolbar hanya bila disediakan', async () => {
    const user = userEvent.setup();
    const onPolish = vi.fn();
    const { unmount } = render(
      <RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" onPolish={onPolish} polishLabel="Poles ulang" />,
    );
    await user.click(screen.getByRole('button', { name: 'Poles ulang' }));
    expect(onPolish).toHaveBeenCalledTimes(1);
    unmount();
    render(<RichTextEditor onDocChange={() => {}} command={async () => null} labelledBy="body-label" />);
    expect(screen.queryByRole('button', { name: 'Poles isi' })).toBeNull();
  });
});
