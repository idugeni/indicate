import type { MediaOwner } from '@/modules/publishing/models';
import type { CompressOptions } from '@/modules/publishing/compress-image';
import type { MediaPurpose } from '@/modules/publishing/object-key';
import { INLINE_COMPRESS, formatBytes, prepareImageUpload } from '@/modules/publishing/compress-image';
import { normalizeImageSource } from '@/modules/publishing/heic-source';

type CommandFn = (action: string, payload: unknown) => Promise<unknown>;
type PrepareFn = typeof prepareImageUpload;
type FetchFn = typeof fetch;

interface ReservationResponse {
  readonly reservationId?: string;
  readonly authorization?: { readonly url?: string; readonly requiredHeaders?: Record<string, string> };
  readonly thumb?: { readonly authorization?: { readonly url?: string; readonly requiredHeaders?: Record<string, string> } } | null;
}

interface CompletedMedia {
  readonly id?: string;
  readonly version?: number;
}

/** Options for {@link uploadEditorImage}; every field has a production default. */
export interface UploadEditorImageOptions {
  /** Media purpose to reserve; defaults to `article-inline`. */
  readonly purpose?: MediaPurpose;
  /** Compression budget; defaults to the inline preset. */
  readonly compress?: CompressOptions;
  /** Called when a HEIC source starts converting, for progress copy. */
  readonly onConverting?: () => void;
  /** Injectable browser dependencies for testing. */
  readonly convert?: (blob: Blob) => Promise<Blob | Blob[]>;
  /** Injectable browser dependencies for testing. */
  readonly prepare?: PrepareFn;
  /** Injectable browser dependencies for testing. */
  readonly fetchFn?: FetchFn;
}

/**
 * Upload an editorial image through the existing R2 reservation flow.
 *
 * @param file - Source image file from the picker.
 * @param owner - Media owner; new drafts use `{ kind: 'organization' }`.
 * @param command - Dashboard command dispatcher (`media.reserve`, `media.complete`, `media.read`).
 * @param options - Purpose, compression budget, conversion progress, and injectable browser dependencies.
 * @returns Durable stored `src`, a preview URL for the editor canvas, the media id, the activated version, and the stored/thrifted byte counts.
 * @throws {Error} With an Indonesian user-facing message when the HEIC conversion fails, the source file is over the size ceiling, or any step fails.
 */
export async function uploadEditorImage(
  file: File,
  owner: MediaOwner,
  command: CommandFn,
  options: UploadEditorImageOptions = {},
): Promise<{
  readonly storedSrc: string;
  readonly previewUrl: string;
  readonly mediaId: string;
  readonly version: number;
  readonly sizeBytes: number;
  readonly savingsBytes: number;
}> {
  const prepare = options.prepare ?? prepareImageUpload;
  const fetchFn = options.fetchFn ?? fetch;
  const compress = options.compress ?? INLINE_COMPRESS;
  const source = await normalizeImageSource(file, {
    ...(options.onConverting === undefined ? {} : { onConverting: options.onConverting }),
    ...(options.convert === undefined ? {} : { convert: options.convert }),
  });
  if (compress.maxSourceBytes !== undefined && source.size > compress.maxSourceBytes) {
    throw new Error(`Ukuran berkas melebihi ${formatBytes(compress.maxSourceBytes)}. Pilih foto dengan resolusi lebih rendah.`);
  }
  const prepared = await prepare(source, compress);
  const thumbSpec =
    prepared.thumb === null
      ? null
      : { mediaType: 'image/webp' as const, sizeBytes: prepared.thumb.sizeBytes, checksum: prepared.thumb.checksum };
  const reserved = (await command('media.reserve', {
    filename: prepared.filename,
    mediaType: prepared.mediaType,
    sizeBytes: prepared.sizeBytes,
    checksum: prepared.checksum,
    purpose: options.purpose ?? 'article-inline',
    owner,
    ...(thumbSpec === null ? {} : { thumb: thumbSpec }),
  })) as ReservationResponse | null;
  if (reserved?.reservationId === undefined || reserved.authorization?.url === undefined || reserved.authorization.requiredHeaders === undefined) {
    throw new Error('Gagal menyiapkan penyimpanan. Coba lagi.');
  }
  const uploadResponse = await fetchFn(reserved.authorization.url, {
    method: 'PUT',
    headers: reserved.authorization.requiredHeaders,
    body: prepared.blob,
  });
  if (!uploadResponse.ok) throw new Error('Gagal mengunggah. Periksa koneksi lalu coba lagi.');
  let thumbPayload: { readonly sizeBytes: number; readonly checksum: string } | undefined;
  const thumbAuth = reserved.thumb?.authorization;
  if (prepared.thumb !== null && thumbAuth?.url !== undefined && thumbAuth.requiredHeaders !== undefined) {
    const thumbResponse = await fetchFn(thumbAuth.url, { method: 'PUT', headers: thumbAuth.requiredHeaders, body: prepared.thumb.blob });
    if (thumbResponse.ok) thumbPayload = { sizeBytes: prepared.thumb.sizeBytes, checksum: prepared.thumb.checksum };
  }
  const dimensions =
    prepared.width !== null && prepared.height !== null && Number.isInteger(prepared.width) && Number.isInteger(prepared.height) && prepared.width > 0 && prepared.height > 0
      ? { widthPx: prepared.width, heightPx: prepared.height }
      : undefined;
  const completed = (await command('media.complete', { reservationId: reserved.reservationId, ...(thumbPayload === undefined ? {} : { thumb: thumbPayload }), ...(dimensions === undefined ? {} : dimensions) })) as CompletedMedia | null;
  const mediaId = completed?.id;
  if (typeof mediaId !== 'string' || mediaId === '') throw new Error('Pemeriksaan berkas gagal. Coba unggah ulang.');
  const storedSrc = `/api/network/media/${mediaId}`;
  const stored = {
    storedSrc,
    mediaId,
    version: typeof completed?.version === 'number' ? completed.version : 1,
    sizeBytes: prepared.sizeBytes,
    savingsBytes: prepared.savingsBytes,
  } as const;
  try {
    const read = (await command('media.read', { mediaId })) as { readonly url?: string } | null;
    if (typeof read?.url === 'string' && read.url !== '') return { ...stored, previewUrl: read.url };
  } catch {
    /* Fall through to the durable relative URL. */
  }
  return { ...stored, previewUrl: storedSrc };
}
