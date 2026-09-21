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
    const file = new File([new Uint8Array([1, 2, 3])], 'foto.jpg', { type: 'image/jpeg' });
    const result = await prepareImageUpload(file);
    expect(result.mode).toBe('passthrough');
    expect(result.blob).toBe(file);
    expect(result.filename).toBe('foto.jpg');
    expect(result.mediaType).toBe('image/jpeg');
    expect(result.sizeBytes).toBe(file.size);
    expect(result.savingsBytes).toBe(0);
    expect(result.thumb).toBe(null);
    expect(result.width).toBe(null);
    expect(result.height).toBe(null);
    expect(result.checksum.length).toBeGreaterThan(0);
  });
});
