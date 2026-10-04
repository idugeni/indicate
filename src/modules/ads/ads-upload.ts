import type { AuthorizedTenantActorContext } from '@/core/operation-context';
import type { ObjectStoragePort } from '@/integrations/storage/ports';
import type { AdsUploadedCreativeInput } from '@/modules/ads/ports';

/**
 * Upload-capable slice of the ads persistence boundary.
 *
 * @remarks Structural so the orchestrator stays decoupled from the full
 * repository contract; `DrizzleAdsRepository` satisfies it via its
 * `createUploadedCreative` method.
 */
export interface AdCreativeUploadRepository {
  createUploadedCreative(actor: AuthorizedTenantActorContext, input: AdsUploadedCreativeInput): Promise<{ readonly id: string }>;
}

/** Largest accepted upload body: 5 MiB. */
export const AD_CREATIVE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/** Longest accepted image edge in pixels; larger frames are rejected. */
export const AD_CREATIVE_UPLOAD_MAX_EDGE_PX = 4096;

export class AdsUploadRejectedError extends Error {}
export class AdsUploadUnavailableError extends Error {}

export interface AdCreativeUploadFile {
  readonly bytes: Uint8Array;
  readonly filename: string;
  readonly contentType: string;
}

export interface AdCreativeUploadFields {
  readonly campaignId: string | null;
  readonly href?: string | undefined;
  readonly alt?: string | undefined;
}

export type AdCreativeUploadStorage = Pick<ObjectStoragePort, 'putExact' | 'deleteExact'>;

export type AdCreativeDimensionReader = (bytes: Uint8Array) => Promise<{ readonly width: number; readonly height: number } | null>;

const EXTENSION_BY_TYPE: Readonly<Record<string, string>> = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
});

/**
 * Derive a safe file extension from an image MIME type.
 *
 * @param contentType - Client-declared MIME type, already checked for the `image/` prefix.
 * @returns Known short extension, else the sanitized subtype, else `img`.
 */
export function extensionForImageType(contentType: string): string {
  const known = EXTENSION_BY_TYPE[contentType.toLowerCase()];
  if (known !== undefined) return known;
  const subtype = contentType.toLowerCase().split('/')[1] ?? '';
  const safe = subtype.replace(/[^a-z0-9]/g, '').slice(0, 10);
  return safe === '' ? 'img' : safe;
}

/**
 * Read natural image dimensions without transcoding.
 *
 * @param bytes - Original upload bytes, kept intact for storage.
 * @returns Width/height pair, or null when the bytes are undecodable.
 */
export async function readImageDimensions(bytes: Uint8Array): Promise<{ readonly width: number; readonly height: number } | null> {
  try {
    const { default: sharp } = await import('sharp');
    const metadata = await sharp(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)).metadata();
    if (metadata.width === undefined || metadata.height === undefined) return null;
    return { width: metadata.width, height: metadata.height };
  } catch {
    return null;
  }
}

/**
 * Validate the cheap upload headers before any storage write.
 *
 * @param file - Raw upload bytes with declared type.
 * @throws {AdsUploadRejectedError} When the MIME is not an image or the size is out of bounds.
 */
export function assertUploadHeaders(file: AdCreativeUploadFile): void {
  if (!file.contentType.toLowerCase().startsWith('image/')) {
    throw new AdsUploadRejectedError('Berkas harus berupa gambar (image/*).');
  }
  if (file.bytes.length === 0 || file.bytes.length > AD_CREATIVE_UPLOAD_MAX_BYTES) {
    throw new AdsUploadRejectedError('Ukuran berkas maksimal 5MB.');
  }
}

/**
 * Validate decoded dimensions against the edge cap.
 *
 * @param dimensions - Natural size, or null when undecodable.
 * @returns The validated dimensions.
 * @throws {AdsUploadRejectedError} When undecodable or any edge exceeds 4096px.
 */
export function assertUploadDimensions(dimensions: { readonly width: number; readonly height: number } | null): { readonly width: number; readonly height: number } {
  if (dimensions === null) throw new AdsUploadRejectedError('Berkas gambar tidak dapat dibaca dimensinya.');
  if (dimensions.width <= 0 || dimensions.height <= 0 || dimensions.width > AD_CREATIVE_UPLOAD_MAX_EDGE_PX || dimensions.height > AD_CREATIVE_UPLOAD_MAX_EDGE_PX) {
    throw new AdsUploadRejectedError('Dimensi gambar maksimal 4096px per sisi.');
  }
  return dimensions;
}

/**
 * Build the public R2 key for an uploaded creative.
 *
 * @param organizationId - Owning tenant organization.
 * @param extension - Safe extension derived from the MIME type.
 * @returns Key shaped as `pub/o/{org}/p/ad-creative/{uuid}.{ext}`.
 */
export function buildAdCreativeObjectKey(organizationId: string, extension: string): string {
  return `pub/o/${organizationId}/p/ad-creative/${crypto.randomUUID()}.${extension}`;
}

/**
 * Store an uploaded creative image and link it as an image creative.
 *
 * @param input - Actor, file, fields, repository, storage, public host, and request id.
 * @returns New creative id with its public image URL.
 * @throws {AdsUploadUnavailableError} When no public host is configured.
 * @throws {AdsUploadRejectedError} When the file fails validation.
 *
 * @remarks No `media` row is written on purpose: purpose `ad-creative` is
 * absent from `MEDIA_PURPOSES` and the `media_owner_prefix` CHECK only
 * admits organization assets under `o/{org}/p/%/organization/%`, so the
 * `pub/o/{org}/p/ad-creative/…` key cannot satisfy it without a migration.
 * Public serving itself only checks the `pub/` prefix, so the R2 URL stored
 * directly on `ad_creatives.imageUrl` stays reachable. Bytes are stored
 * verbatim (no AVIF conversion) to preserve the advertiser aspect ratio.
 * R2 is written before the single DB transaction; a failed transaction
 * deletes the object again via the adapter-supported `deleteExact`.
 */
export async function uploadAdCreativeImage(input: {
  readonly actor: AuthorizedTenantActorContext;
  readonly file: AdCreativeUploadFile;
  readonly fields: AdCreativeUploadFields;
  readonly repository: AdCreativeUploadRepository;
  readonly storage: AdCreativeUploadStorage;  readonly publicHost: string | null;
  readonly requestId: string;
  readonly readDimensions?: AdCreativeDimensionReader | undefined;
}): Promise<{ readonly id: string; readonly imageUrl: string }> {
  if (input.publicHost === null) throw new AdsUploadUnavailableError('Layanan unggah gambar belum dikonfigurasi.');
  assertUploadHeaders(input.file);
  const dimensions = assertUploadDimensions(await (input.readDimensions ?? readImageDimensions)(input.file.bytes));
  const key = buildAdCreativeObjectKey(input.actor.organizationId, extensionForImageType(input.file.contentType));
  const imageUrl = `https://${input.publicHost}/${key}`;
  await input.storage.putExact(key, input.file.bytes, input.file.contentType);
  try {
    const created = await input.repository.createUploadedCreative(input.actor, {
      campaignId: input.fields.campaignId,
      imageUrl,
      href: input.fields.href,
      alt: input.fields.alt,
      width: dimensions.width,
      height: dimensions.height,
      requestId: input.requestId,
    });
    return { id: created.id, imageUrl };
  } catch (error) {
    try {
      await input.storage.deleteExact(key);
    } catch {
      // Best-effort orphan cleanup; the DB error below is authoritative.
    }
    throw error;
  }
}
