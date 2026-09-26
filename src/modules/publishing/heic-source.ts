const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
const HEIC_EXTENSION = /\.hei[cf]$/iu;
const CONVERSION_FAILED = 'Gagal mengonversi HEIC. Coba simpan ulang foto sebagai JPG dari galeri lalu unggah lagi.';

/** Injectable browser dependencies so the conversion path is testable. */
export interface ImageSourceDeps {
  /** Overrides the `heic2any` conversion; defaults to the real library. */
  readonly convert?: (blob: Blob) => Promise<Blob | Blob[]>;
  /** Called once when a conversion is about to start, for progress copy. */
  readonly onConverting?: () => void;
}

/**
 * Report whether a file is a HEIF-family source that browsers cannot decode.
 *
 * @param file - Candidate upload.
 * @returns True for HEIC/HEIF by MIME type or by extension.
 */
export function isHeicSource(file: File): boolean {
  return HEIC_TYPES.has(file.type) || HEIC_EXTENSION.test(file.name);
}

function stemOf(filename: string): string {
  const stem = filename.replace(/\.[a-z0-9]{1,10}$/iu, '');
  return stem === '' ? 'file' : stem;
}

async function convertWithHeic2any(blob: Blob): Promise<Blob | Blob[]> {
  const { default: heic2any } = await import('heic2any');
  return heic2any({ blob, toType: 'image/jpeg', quality: 0.92 });
}

/**
 * Convert a HEIF-family upload to JPEG so the compression ladder can decode it.
 *
 * Browsers have no HEIC decoder, so a HEIC source would otherwise fall through
 * `prepareImageUpload` untouched and be rejected by the media MIME allowlist.
 * Any other file is returned as-is, so this is safe to call on every upload.
 *
 * @param file - Source file chosen by the editor.
 * @param deps - Injectable converter and progress callback.
 * @returns A JPEG `File` for HEIC sources; the original file otherwise.
 * @throws {Error} With an Indonesian user-facing message when conversion fails or yields nothing.
 * @example
 * ```ts
 * const source = await normalizeImageSource(file, { onConverting: () => setStatus('Mengonversi…') });
 * ```
 */
export async function normalizeImageSource(file: File, deps: ImageSourceDeps = {}): Promise<File> {
  if (!isHeicSource(file)) return file;
  deps.onConverting?.();
  const convert = deps.convert ?? convertWithHeic2any;
  let converted: Blob | Blob[];
  try {
    converted = await convert(file);
  } catch {
    throw new Error(CONVERSION_FAILED);
  }
  const first = Array.isArray(converted) ? converted[0] : converted;
  if (!(first instanceof Blob) || first.size === 0) throw new Error(CONVERSION_FAILED);
  return new File([first], `${stemOf(file.name)}.jpg`, { type: 'image/jpeg' });
}
