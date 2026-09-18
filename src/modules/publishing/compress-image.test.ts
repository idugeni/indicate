import { describe, expect, it } from 'vitest';

import { formatBytes, prepareImageUpload } from '@/modules/publishing/compress-image';

describe('formatBytes', () => {
  it('menampilkan byte mentah di bawah 1 KB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('memformat KB, MB, dan GB gaya id-ID', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1,5 KB');
    expect(formatBytes(1572864)).toBe('1,5 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('prepareImageUpload', () => {
  it('melewatkan berkas apa adanya saat decode gagal', async () => {
    const berkas = new File([new Uint8Array([1, 2, 3])], 'foto.jpg', { type: 'image/jpeg' });
    const hasil = await prepareImageUpload(berkas);
    expect(hasil.mode).toBe('passthrough');
    expect(hasil.blob).toBe(berkas);
    expect(hasil.filename).toBe('foto.jpg');
    expect(hasil.mediaType).toBe('image/jpeg');
    expect(hasil.sizeBytes).toBe(berkas.size);
    expect(hasil.savingsBytes).toBe(0);
    expect(hasil.thumb).toBe(null);
    expect(hasil.width).toBe(null);
    expect(hasil.height).toBe(null);
    expect(hasil.checksum.length).toBeGreaterThan(0);
  });
});
