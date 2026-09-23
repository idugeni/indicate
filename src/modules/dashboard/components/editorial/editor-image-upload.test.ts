import { describe, expect, it, vi } from 'vitest';

import { uploadEditorImage } from '@/modules/dashboard/components/editorial/editor-image-upload';

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
});
