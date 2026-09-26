import { afterEach, describe, expect, it } from 'vitest';

import { formatBytes, prepareImageUpload, type ImageRung } from '@/modules/publishing/compress-image';

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

interface Attempt {
  readonly width: number;
  readonly height: number;
  readonly quality: number;
}

/**
 * Plausible WebP size model: roughly 0.26 bytes per pixel at q0.82, falling
 * about linearly with quality, which is the shape real encoders show in this
 * range. Quality has to be part of the model or the quality rungs are no-ops.
 */
const bytesPerPixel = (attempt: Attempt): number => Math.round(attempt.width * attempt.height * (0.06 + attempt.quality * 0.24));

function stubEncoder(source: { readonly width: number; readonly height: number }, bytesFor: (attempt: Attempt) => number): { readonly attempts: Attempt[]; restore(): void } {
  const attempts: Attempt[] = [];
  const globals = globalThis as { createImageBitmap?: unknown; document?: unknown };
  const originalBitmap = globals.createImageBitmap;
  const originalDocument = globals.document;
  globals.createImageBitmap = async () => ({ width: source.width, height: source.height, close: () => undefined });
  globals.document = {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({ drawImage: () => undefined }),
        toBlob: (callback: (blob: Blob) => void, _type: string, quality: number) => {
          const attempt = { width: canvas.width, height: canvas.height, quality };
          attempts.push(attempt);
          callback(new Blob([new Uint8Array(bytesFor(attempt))]));
        },
      };
      return canvas;
    },
  };
  return {
    attempts,
    restore() {
      if (originalBitmap === undefined) delete globals.createImageBitmap;
      else globals.createImageBitmap = originalBitmap;
      if (originalDocument === undefined) delete globals.document;
      else globals.document = originalDocument;
    },
  };
}

function sourceFile(bytes: number, type = 'image/jpeg'): File {
  return new File([new Uint8Array(bytes)], 'foto.jpg', { type });
}

const restoreStub: Array<() => void> = [];
afterEach(() => {
  for (const restore of restoreStub.splice(0)) restore();
});

function stub(source: { readonly width: number; readonly height: number }, bytesFor: (attempt: Attempt) => number): Attempt[] {
  const harness = stubEncoder(source, bytesFor);
  restoreStub.push(harness.restore);
  return harness.attempts;
}

describe('prepareImageUpload ladder', () => {
  it('menurunkan resolusi pada kualitas tetap 0.82 sebelum menyentuh kualitas', async () => {
    const attempts = stub({ width: 3000, height: 2000 }, bytesPerPixel);
    const result = await prepareImageUpload(sourceFile(4_000_000), { passthroughBytes: 0 });

    expect(result.mode).toBe('compressed');
    expect(result.mediaType).toBe('image/webp');
    expect(result.width).toBe(896);
    expect(result.height).toBe(597);
    // The thumbnail encodes land after the full-variant rungs, so scope to those.
    expect(attempts.slice(0, 4)).toEqual([
      { width: 1280, height: 853, quality: 0.82 },
      { width: 1152, height: 768, quality: 0.82 },
      { width: 1024, height: 683, quality: 0.82 },
      { width: 896, height: 597, quality: 0.82 },
    ]);
  });

  it('memangkas kualitas hanya setelah resolusi mentok', async () => {
    const rungs: readonly ImageRung[] = [
      { edge: 1280, quality: 0.82 },
      { edge: 640, quality: 0.82 },
      { edge: 640, quality: 0.62 },
    ];
    const attempts = stub({ width: 3000, height: 2000 }, bytesPerPixel);
    const result = await prepareImageUpload(sourceFile(4_000_000), { targetBytes: 65_000, passthroughBytes: 0, rungs });

    expect(result.width).toBe(640);
    expect(result.height).toBe(427);
    expect(attempts.slice(0, 3)).toEqual([
      { width: 1280, height: 853, quality: 0.82 },
      { width: 640, height: 427, quality: 0.82 },
      { width: 640, height: 427, quality: 0.62 },
    ]);
  });

  it('tidak mengulang encode identik saat sumber lebih kecil dari beberapa rung', async () => {
    const attempts = stub({ width: 600, height: 400 }, () => 900_000);
    await prepareImageUpload(sourceFile(4_000_000), { passthroughBytes: 0 });

    const keys = attempts.map((attempt) => `${attempt.width}x${attempt.height}@${attempt.quality}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => key === '600x400@0.82')).toHaveLength(1);
  });

  it('meneruskan berkas asli saat tidak ada rung yang lebih kecil dari sumber', async () => {
    stub({ width: 3000, height: 2000 }, () => 200_000);
    const file = sourceFile(1_000);
    const result = await prepareImageUpload(file, { passthroughBytes: 0 });

    expect(result.mode).toBe('passthrough');
    expect(result.blob).toBe(file);
  });

  it('membuat thumbnail pada skala listing dengan tepi panjang 640 px', async () => {
    const attempts = stub({ width: 3000, height: 2000 }, bytesPerPixel);
    const result = await prepareImageUpload(sourceFile(4_000_000), { passthroughBytes: 0 });

    expect(result.thumb).not.toBe(null);
    expect(Math.max(result.thumb!.width, result.thumb!.height)).toBe(640);
    expect(result.thumb!.sizeBytes).toBeLessThanOrEqual(65_536);
    expect(result.thumb!.sizeBytes).toBeLessThan(result.sizeBytes);
    expect(attempts.some((attempt) => attempt.width === 640)).toBe(true);
  });

  it('melewati thumbnail saat sumber sudah sekecil ambang', async () => {
    stub({ width: 700, height: 500 }, bytesPerPixel);
    const result = await prepareImageUpload(sourceFile(4_000_000), { passthroughBytes: 0 });

    expect(result.thumb).toBe(null);
  });
});
