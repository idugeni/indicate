import { describe, expect, it, vi } from 'vitest';

import { isHeicSource, normalizeImageSource } from '@/modules/publishing/heic-source';

const heic = (name = 'IMG_0001.HEIC', type = 'image/heic'): File => new File([new Uint8Array([1, 2, 3, 4])], name, { type });

describe('isHeicSource', () => {
  it('mengenali HEIF berdasarkan tipe MIME maupun ekstensi', () => {
    expect(isHeicSource(heic())).toBe(true);
    expect(isHeicSource(heic('IMG_0001.HEIF', 'image/heif'))).toBe(true);
    expect(isHeicSource(heic('IMG_0001.HEIC', ''))).toBe(true);
    expect(isHeicSource(heic('IMG_0001.heif', 'application/octet-stream'))).toBe(true);
  });

  it('menolak berkas gambar lain meski namanya mengandung heic', () => {
    expect(isHeicSource(new File([new Uint8Array([1])], 'foto.jpg', { type: 'image/jpeg' }))).toBe(false);
    expect(isHeicSource(new File([new Uint8Array([1])], 'heic-story.png', { type: 'image/png' }))).toBe(false);
  });
});

describe('normalizeImageSource', () => {
  it('mengembalikan berkas non-HEIC tanpa menyentuh konverter', async () => {
    const convert = vi.fn();
    const jpeg = new File([new Uint8Array([9, 9])], 'foto.jpg', { type: 'image/jpeg' });
    const result = await normalizeImageSource(jpeg, { convert: convert as never });

    expect(result).toBe(jpeg);
    expect(convert).not.toHaveBeenCalled();
  });

  it('mengonversi HEIC ke JPEG dan melaporkan progres sekali', async () => {
    const onConverting = vi.fn();
    const convert = vi.fn(async () => new Blob([new Uint8Array(64)], { type: 'image/jpeg' }));
    const result = await normalizeImageSource(heic('IMG_0001.HEIC'), { convert: convert as never, onConverting });

    expect(result.name).toBe('IMG_0001.jpg');
    expect(result.type).toBe('image/jpeg');
    expect(result.size).toBe(64);
    expect(onConverting).toHaveBeenCalledTimes(1);
  });

  it('mengambil gambar pertama dari hasil berurutan', async () => {
    const convert = vi.fn(async () => [new Blob([new Uint8Array(8)], { type: 'image/jpeg' }), new Blob([new Uint8Array(16)], { type: 'image/jpeg' })]);
    const result = await normalizeImageSource(heic(), { convert: convert as never });

    expect(result.size).toBe(8);
  });

  it('memberi pesan yang jelas saat konversi melempar atau kosong', async () => {
    const throwing = vi.fn(async () => {
      throw new Error('wasm gagal');
    });
    const empty = vi.fn(async () => new Blob([], { type: 'image/jpeg' }));

    await expect(normalizeImageSource(heic(), { convert: throwing as never })).rejects.toThrow('Gagal mengonversi HEIC');
    await expect(normalizeImageSource(heic(), { convert: empty as never })).rejects.toThrow('Gagal mengonversi HEIC');
  });

  it('menyediakan nama berkas yang valid untuk nama tanpa ekstensi', async () => {
    const convert = vi.fn(async () => new Blob([new Uint8Array(4)], { type: 'image/jpeg' }));
    const result = await normalizeImageSource(heic('IMG.HEIC'), { convert: convert as never });

    expect(result.name).toBe('IMG.jpg');
  });
});
