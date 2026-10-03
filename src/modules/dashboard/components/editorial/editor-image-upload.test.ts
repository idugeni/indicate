import { describe, expect, it, vi } from 'vitest';

import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';
import { COVER_COMPRESS } from '@/modules/publishing/compress-image';

function mockPrepare() {
  const blob = new Blob(['gambar'], { type: 'image/webp' });
  return {
    blob,
    filename: 'pasar.webp',
    mediaType: 'image/webp',
    sizeBytes: 6,
    checksum: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    width: 1200,
    height: 675,
    mode: 'passthrough' as const,
    savingsBytes: 0,
    thumb: null,
  };
}

describe('uploadEditorImage', () => {
  it('melewati alur reserve, unggah, complete, dan read media', async () => {
    const command = vi.fn(async (action: string) => {
      if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { 'Content-Type': 'image/webp' } }, thumb: null };
      if (action === 'media.complete') return { id: '0199a2b3-4c5d-7e8f-9012-3456789abcde' };
      if (action === 'media.read') return { url: 'https://r2.example/preview' };
      throw new Error(`unexpected ${action}`);
    });
    const fetchFn = vi.fn(async () => ({ ok: true }) as Response);
    const file = new File(['gambar'], 'pasar.jpg', { type: 'image/jpeg' });
    const result = await uploadEditorImage(file, { kind: 'organization' }, command, { prepare: mockPrepare as never, fetchFn: fetchFn as never });
    expect(result.storedSrc).toBe('/api/network/media/0199a2b3-4c5d-7e8f-9012-3456789abcde');
    expect(result.previewUrl).toBe('https://r2.example/preview');
    expect(command).toHaveBeenCalledWith('media.reserve', expect.objectContaining({ purpose: 'article-inline' }));
    expect(command).toHaveBeenCalledWith('media.complete', expect.objectContaining({ widthPx: 1200, heightPx: 675 }));
  });

  it('gagal jelas saat reservasi tidak lengkap', async () => {
    const command = vi.fn(async () => null);
    const file = new File(['gambar'], 'pasar.jpg', { type: 'image/jpeg' });
    await expect(uploadEditorImage(file, { kind: 'organization' }, command, { prepare: mockPrepare as never })).rejects.toThrow('Gagal menyiapkan penyimpanan');
  });

  it('meneruskan purpose dan anggaran kompresi untuk sampul artikel', async () => {
    const command = vi.fn(async (action: string) => {
      if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { 'Content-Type': 'image/webp' } }, thumb: null };
      if (action === 'media.complete') return { id: '0199a2b3-4c5d-7e8f-9012-3456789abcde', version: 1 };
      if (action === 'media.read') return { url: 'https://r2.example/preview' };
      throw new Error(`unexpected ${action}`);
    });
    const fetchFn = vi.fn(async () => ({ ok: true }) as Response);
    const prepare = vi.fn(() => Promise.resolve(mockPrepare()));
    const file = new File(['gambar'], 'sampul.jpg', { type: 'image/jpeg' });
    const result = await uploadEditorImage(file, { kind: 'organization' }, command, {
      purpose: 'article-cover',
      compress: COVER_COMPRESS,
      prepare: prepare as never,
      fetchFn: fetchFn as never,
    });

    expect(prepare).toHaveBeenCalledWith(file, COVER_COMPRESS);
    expect(command).toHaveBeenCalledWith('media.reserve', expect.objectContaining({ purpose: 'article-cover' }));
    expect(result.version).toBe(1);
    expect(result.sizeBytes).toBe(6);
  });

  it('menolak berkas sumber yang melebihi batas sebelum encode berjalan', async () => {
    const command = vi.fn(async () => null);
    const prepare = vi.fn(() => Promise.resolve(mockPrepare()));
    const oversized = { size: COVER_COMPRESS.maxSourceBytes + 1, name: 'besar.jpg', type: 'image/jpeg' } as unknown as File;

    await expect(uploadEditorImage(oversized, { kind: 'organization' }, command, { compress: COVER_COMPRESS, prepare: prepare as never })).rejects.toThrow('Ukuran berkas melebihi 25 MB');
    expect(prepare).not.toHaveBeenCalled();
    expect(command).not.toHaveBeenCalled();
  });

  it('meneruskan HEIC yang sudah dikonversi ke prépare dan.reserve', async () => {
    const command = vi.fn(async (action: string) => {
      if (action === 'media.reserve') return { reservationId: 'res-1', authorization: { url: 'https://r2.example/put', requiredHeaders: { 'Content-Type': 'image/webp' } }, thumb: null };
      if (action === 'media.complete') return { id: '0199a2b3-4c5d-7e8f-9012-3456789abcde' };
      if (action === 'media.read') return { url: 'https://r2.example/preview' };
      throw new Error(`unexpected ${action}`);
    });
    const onConverting = vi.fn();
    const prepare = vi.fn((_file: File, _options?: unknown) => Promise.resolve(mockPrepare()));
    const convert = vi.fn(async () => new Blob([new Uint8Array(64)], { type: 'image/jpeg' }));
    const fetchFn = vi.fn(async () => ({ ok: true }) as Response);
    const heic = new File([new Uint8Array([1, 2, 3])], 'IMG_0001.HEIC', { type: 'image/heic' });

    await uploadEditorImage(heic, { kind: 'organization' }, command, { purpose: 'article-cover', prepare: prepare as never, convert: convert as never, fetchFn: fetchFn as never, onConverting });

    expect(onConverting).toHaveBeenCalledTimes(1);
    expect(convert).toHaveBeenCalledTimes(1);
    const [preparedFile] = prepare.mock.calls[0]!;
    expect(preparedFile.name).toBe('IMG_0001.jpg');
    expect(preparedFile.type).toBe('image/jpeg');
    expect(command).toHaveBeenCalledWith('media.reserve', expect.objectContaining({ purpose: 'article-cover', mediaType: 'image/webp' }));
  });
});
