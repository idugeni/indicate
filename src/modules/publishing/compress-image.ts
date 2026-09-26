/**
 * Client-safe adaptive image preparation (browser DOM + Web Crypto only).
 * No server imports: safe to bundle into `use client` components.
 *
 * Produces a delivery full variant plus an optional listing thumbnail, both
 * WebP. Strategy, quality-first under a hard byte ceiling:
 * 1. Files that are already delivery-efficient (WebP/AVIF under target, or
 *    tiny files within dimension bounds) pass through untouched — recompressing
 *    them wastes client CPU for negligible byte savings.
 * 2. Otherwise walk an ordered rung list and keep the first encode at or under
 *    the byte target. Rungs hold WebP quality at 0.82 while shrinking the long
 *    edge, because a smaller canvas is what buys bytes; quality is only trimmed
 *    at the end, once resolution has bottomed out (never upscale: a result
 *    larger than the source falls back to passthrough).
 * 3. Thumbnails follow the same rules at listing scale and are only kept when
 *    strictly smaller than the chosen full variant.
 * 4. Any decode/encode failure degrades to passthrough — compression must
 *    never block an upload the server would otherwise accept.
 *
 * @remarks Perceptual note: pixels are the expensive part of a WebP encode, and
 * resolution loss is recoverable-looking while quality loss is not. A
 * 1280-to-768 px cut removes about 64% of the encoded samples, whereas dropping
 * q0.82 to q0.62 shows up as banding and blocking in skies and skin. The rung
 * order therefore spends resolution first and quality last.
 */

export interface PreparedThumb {
  readonly blob: Blob;
  readonly sizeBytes: number;
  readonly checksum: string;
  readonly mediaType: 'image/webp';
  readonly width: number;
  readonly height: number;
}

export interface PreparedUpload {
  readonly blob: Blob;
  readonly filename: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  /** Base64 SHA-256 of the final bytes (matches `mediaReservationSchema`). */
  readonly checksum: string;
  readonly width: number | null;
  readonly height: number | null;
  readonly mode: 'compressed' | 'passthrough';
  readonly savingsBytes: number;
  readonly thumb: PreparedThumb | null;
}

export interface CompressOptions {
  /** Byte ceiling for the full variant; the ladder keeps the best rung that fits. */
  readonly targetBytes?: number;
  /** Long-edge cap in px. Never upscales. */
  readonly maxDimension?: number;
  /**
   * Optional server policy ceiling (`media_policy.max_object_bytes`). The
   * effective target becomes `min(targetBytes, policyMaxBytes)` so the client
   * never aims above what the server accepts.
   */
  readonly policyMaxBytes?: number;
  /** Files at or under this size skip recompression when already efficient. */
  readonly passthroughBytes?: number;
  /**
   * Largest source file the caller should attempt at all. Browsers allocate a
   * full bitmap per decode attempt, so a multi-hundred-megabyte file costs real
   * memory on the editor's device; rejecting it up front beats encoding it.
   */
  readonly maxSourceBytes?: number;
  /** Ordered search path; the first rung whose encode fits the target wins. */
  readonly rungs?: readonly ImageRung[];
}

/** One attempt in the encode search: a long-edge cap plus a WebP quality. */
export interface ImageRung {
  /** Long edge in px for this attempt; clamped down to the source long edge. */
  readonly edge: number;
  /** WebP quality for this attempt. */
  readonly quality: number;
}

/** A {@link CompressOptions} with every tuning field pinned by a preset. */
export type ResolvedCompressOptions = Required<Omit<CompressOptions, 'policyMaxBytes'>>;

/**
 * Source-size ceiling shared by both presets. Roughly ten times a full-resolution
 * DSLR JPEG, so no ordinary camera output is refused, while archive dumps and
 * RAW/ProRAW exports are turned away before the browser allocates a bitmap.
 */
const MAX_SOURCE_BYTES = 26_214_400;

/**
 * Body images: `EditorialImage` renders inline art at most 768 CSS px wide, so
 * a 1280 px long edge still covers 2x DPR without wasting bytes on 4K sources.
 */
export const INLINE_COMPRESS: ResolvedCompressOptions = Object.freeze({
  targetBytes: 163_840,
  maxDimension: 1280,
  passthroughBytes: 131_072,
  maxSourceBytes: MAX_SOURCE_BYTES,
  rungs: Object.freeze([
    { edge: 1280, quality: 0.82 },
    { edge: 1152, quality: 0.82 },
    { edge: 1024, quality: 0.82 },
    { edge: 896, quality: 0.82 },
    { edge: 768, quality: 0.82 },
    { edge: 768, quality: 0.72 },
    { edge: 768, quality: 0.62 },
    { edge: 640, quality: 0.6 },
    { edge: 640, quality: 0.5 },
  ]),
});

/**
 * Featured covers: the widest template renders full-bleed at 1600 px, so the
 * cover keeps a larger ceiling and a larger first rung than body images.
 */
export const COVER_COMPRESS: ResolvedCompressOptions = Object.freeze({
  targetBytes: 266_240,
  maxDimension: 1600,
  passthroughBytes: 131_072,
  maxSourceBytes: MAX_SOURCE_BYTES,
  rungs: Object.freeze([
    { edge: 1600, quality: 0.82 },
    { edge: 1440, quality: 0.82 },
    { edge: 1280, quality: 0.82 },
    { edge: 1152, quality: 0.82 },
    { edge: 1024, quality: 0.82 },
    { edge: 1024, quality: 0.72 },
    { edge: 896, quality: 0.72 },
    { edge: 768, quality: 0.62 },
    { edge: 640, quality: 0.55 },
  ]),
});

/**
 * Listing thumbnail rungs. Every rung holds the 640 px edge and spends quality
 * instead, because `EditorialImage` declares the thumbnail as `640w` in its
 * `srcSet`: a stored 512 px thumb under a `640w` descriptor would upscale in
 * the browser and misreport the intrinsic width.
 */
const THUMB_RUNGS: readonly ImageRung[] = [
  { edge: 640, quality: 0.72 },
  { edge: 640, quality: 0.62 },
  { edge: 640, quality: 0.52 },
  { edge: 640, quality: 0.42 },
];
const THUMB_TARGET_BYTES = 65_536;
const THUMB_MIN_SOURCE_EDGE = 720;
const DEFAULT_TARGET_BYTES = INLINE_COMPRESS.targetBytes;
const DEFAULT_MAX_DIMENSION = INLINE_COMPRESS.maxDimension;
const DEFAULT_PASSTHROUGH_BYTES = INLINE_COMPRESS.passthroughBytes;
const DEFAULT_RUNGS = INLINE_COMPRESS.rungs;
/** Formats already efficient enough to skip recompression when under target. */
const EFFICIENT_TYPES = new Set(['image/webp', 'image/avif']);

interface Encoded {
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
}

function base64Sha256(bytes: ArrayBuffer): Promise<string> {
  return crypto.subtle.digest('SHA-256', bytes).then((digest) => {
    const hashArray = Array.from(new Uint8Array(digest));
    return btoa(hashArray.map((b) => String.fromCharCode(b)).join(''));
  });
}

async function decodeBitmap(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
}

function encodeWebp(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
  });
}

function scaledSize(width: number, height: number, longEdge: number): { width: number; height: number } {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** First encode at or under target; always tracks the smallest seen. */
async function runLadder(
  bitmap: ImageBitmap,
  sourceWidth: number,
  sourceHeight: number,
  rungs: readonly ImageRung[],
  targetBytes: number,
): Promise<{ pick: Encoded | null; smallest: Encoded | null }> {
  let smallest: Encoded | null = null;
  let attempted = '';
  for (const rung of rungs) {
    const { width, height } = scaledSize(sourceWidth, sourceHeight, rung.edge);
    const attempt = `${width}x${height}@${rung.quality}`;
    if (attempt === attempted) continue;
    attempted = attempt;
    const blob = await encodeWebp(bitmap, width, height, rung.quality);
    if (blob === null) continue;
    const encoded: Encoded = { blob, width, height };
    if (smallest === null || blob.size < smallest.blob.size) smallest = encoded;
    if (blob.size <= targetBytes) return { pick: encoded, smallest };
  }
  return { pick: null, smallest };
}

function withWebpExtension(filename: string): string {
  const stem = filename.replace(/\.[a-z0-9]{1,10}$/i, '');
  return `${stem === '' ? 'file' : stem}.webp`;
}

async function passthrough(file: File, width: number | null, height: number | null, thumb: PreparedThumb | null): Promise<PreparedUpload> {
  const bytes = await file.arrayBuffer();
  return {
    blob: file,
    filename: file.name,
    mediaType: file.type,
    sizeBytes: file.size,
    checksum: await base64Sha256(bytes),
    width,
    height,
    mode: 'passthrough',
    savingsBytes: 0,
    thumb,
  };
}

async function buildThumb(bitmap: ImageBitmap, sourceWidth: number, sourceHeight: number, fullBytes: number): Promise<PreparedThumb | null> {
  if (Math.max(sourceWidth, sourceHeight) <= THUMB_MIN_SOURCE_EDGE) return null;
  const { pick, smallest } = await runLadder(bitmap, sourceWidth, sourceHeight, THUMB_RUNGS, THUMB_TARGET_BYTES);
  const candidate = pick ?? (smallest !== null && smallest.blob.size < fullBytes ? smallest : null);
  if (candidate === null || candidate.blob.size >= fullBytes) return null;
  const bytes = await candidate.blob.arrayBuffer();
  return {
    blob: candidate.blob,
    sizeBytes: candidate.blob.size,
    checksum: await base64Sha256(bytes),
    mediaType: 'image/webp',
    width: candidate.width,
    height: candidate.height,
  };
}

export async function prepareImageUpload(file: File, options: CompressOptions = {}): Promise<PreparedUpload> {
  const policyCap = options.policyMaxBytes !== undefined && options.policyMaxBytes > 0 ? options.policyMaxBytes : Number.POSITIVE_INFINITY;
  const target = Math.min(options.targetBytes ?? DEFAULT_TARGET_BYTES, policyCap);
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const passthroughBudget = options.passthroughBytes ?? DEFAULT_PASSTHROUGH_BYTES;
  const rungs = options.rungs ?? DEFAULT_RUNGS;

  const bitmap = await decodeBitmap(file);
  if (bitmap === null) return passthrough(file, null, null, null);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const longEdge = Math.max(sourceWidth, sourceHeight);

  if (
    (EFFICIENT_TYPES.has(file.type) && file.size <= target) ||
    (file.size <= passthroughBudget && longEdge <= maxDimension)
  ) {
    const thumb = await buildThumb(bitmap, sourceWidth, sourceHeight, file.size);
    bitmap.close();
    return passthrough(file, sourceWidth, sourceHeight, thumb);
  }

  const { pick, smallest } = await runLadder(bitmap, sourceWidth, sourceHeight, rungs, target);
  const full = pick ?? (smallest !== null && smallest.blob.size < file.size ? smallest : null);
  const fullBytes = full === null ? file.size : full.blob.size;
  const thumb = await buildThumb(bitmap, sourceWidth, sourceHeight, fullBytes);
  bitmap.close();

  if (full === null) return passthrough(file, sourceWidth, sourceHeight, thumb);
  const bytes = await full.blob.arrayBuffer();
  return {
    blob: full.blob,
    filename: withWebpExtension(file.name),
    mediaType: 'image/webp',
    sizeBytes: full.blob.size,
    checksum: await base64Sha256(bytes),
    width: full.width,
    height: full.height,
    mode: 'compressed',
    savingsBytes: Math.max(0, file.size - full.blob.size),
    thumb,
  };
}

/** Compact `8,2 MB` / `240 KB` status formatting (id-ID). */
export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB'] as const;
  let scaled = value / 1024;
  let unit: string = units[0]!;
  for (const candidate of units.slice(1)) {
    if (scaled < 1024) break;
    scaled /= 1024;
    unit = candidate;
  }
  return `${scaled.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}`;
}
