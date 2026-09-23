import type { MediaOwner } from '@/modules/publishing/models';
import { prepareImageUpload } from '@/modules/publishing/compress-image';

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
}

/**
 * Upload an inline editor image through the existing R2 reservation flow.
 *
 * @param file - Source image file from the editor picker.
 * @param owner - Media owner; new drafts use `{ kind: 'organization' }`.
 * @param command - Dashboard command dispatcher (`media.reserve`, `media.complete`, `media.read`).
 * @param deps - Injectable browser dependencies for testing.
 * @returns Durable stored `src` plus a preview URL for the editor canvas.
 * @throws {Error} With an Indonesian user-facing message when any step fails.
 */
export async function uploadEditorImage(
  file: File,
  owner: MediaOwner,
  command: CommandFn,
  deps: { readonly prepare?: PrepareFn; readonly fetchFn?: FetchFn } = {},
): Promise<{ readonly storedSrc: string; readonly previewUrl: string; readonly mediaId: string }> {
  const prepare = deps.prepare ?? prepareImageUpload;
  const fetchFn = deps.fetchFn ?? fetch;
  const prepared = await prepare(file);
  const thumbSpec =
    prepared.thumb === null
      ? null
      : { mediaType: 'image/webp' as const, sizeBytes: prepared.thumb.sizeBytes, checksum: prepared.thumb.checksum };
  const reserved = (await command('media.reserve', {
    filename: prepared.filename,
    mediaType: prepared.mediaType,
    sizeBytes: prepared.sizeBytes,
    checksum: prepared.checksum,
    purpose: 'article-inline',
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
  const completed = (await command('media.complete', thumbPayload === undefined ? { reservationId: reserved.reservationId } : { reservationId: reserved.reservationId, thumb: thumbPayload })) as CompletedMedia | null;
  const mediaId = completed?.id;
  if (typeof mediaId !== 'string' || mediaId === '') throw new Error('Pemeriksaan berkas gagal. Coba unggah ulang.');
  const storedSrc = `/api/network/media/${mediaId}`;
  try {
    const read = (await command('media.read', { mediaId })) as { readonly url?: string } | null;
    if (typeof read?.url === 'string' && read.url !== '') return { storedSrc, previewUrl: read.url, mediaId };
  } catch {
    /* Fall through to the durable relative URL. */
  }
  return { storedSrc, previewUrl: storedSrc, mediaId };
}
