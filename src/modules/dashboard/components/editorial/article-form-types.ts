/**
 * Konstanta dan penolong kecil bersama untuk formulir tulis artikel.
 *
 * @remarks Diekstrak dari `editorial-form.tsx` agar kanvas, inspektor, dan
 * seksi mode berbagi label tombol, opsi status, dan util sampul yang sama
 * tanpa mengimpor komponen raksasa.
 */

/** Opsi status tulis artikel di bilah aksi. */
export const ARTICLE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draf' },
  { value: 'in_review', label: 'Siap Reviu' },
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'active', label: 'Terbit Langsung' },
] as const;

/** Label tombol simpan mengikuti status tanpa tayang otomatis. */
export const ARTICLE_SUBMIT_LABELS: Record<string, string> = {
  draft: 'Simpan Draf',
  in_review: 'Simpan untuk Reviu',
  scheduled: 'Jadwalkan Terbit',
  active: 'Terbitkan Langsung',
};

/** Label tombol simpan saat tayang otomatis menyala. */
export const ARTICLE_PUBLISH_ON_SAVE_LABELS: Record<string, string> = {
  draft: 'Simpan Draf',
  in_review: 'Simpan untuk Reviu',
  scheduled: 'Jadwalkan dan Terbitkan',
  active: 'Simpan dan Terbitkan',
};

/** Tab editor isi: tulis, pratinjau, dan sumber teks polos. */
export const ARTICLE_MODE_TABS = [
  { value: 'tulis', label: 'Tulis', tip: 'Tulis dan format isi artikel di editor' },
  { value: 'pratinjau', label: 'Pratinjau', tip: 'Lihat tampilan artikel seperti di situs' },
  { value: 'sumber', label: 'Sumber', tip: 'Lihat teks polos arsip dan RSS (hanya baca)' },
] as const;

/** Tipe tab editor isi. */
export type ArticleComposerMode = (typeof ARTICLE_MODE_TABS)[number]['value'];

/** Petunjuk tiap tab editor isi. */
export const ARTICLE_MODE_HINTS: Record<ArticleComposerMode, string> = {
  tulis: 'Tulis dan format isi di editor — inilah yang tersimpan saat Simpan.',
  pratinjau: 'Tampilan artikel seperti di situs. Kembali ke Tulis untuk mengubah.',
  sumber: 'Teks polos yang dibuat otomatis untuk arsip dan RSS — hanya baca.',
};

/** Awalan id kategori yang masih hidup di memori dan belum ada di server. */
export const PENDING_CATEGORY_PREFIX = 'new:';

/** Jumlah pustaka sampul per halaman; otorisasi pratinjau diminta per halaman tampil. */
export const LIBRARY_PAGE = 24;

/** Batas byte gambar untuk caption AI; 5 MB tetap di bawah batas 7 juta karakter base64 server. */
export const COVER_CAPTION_BYTES_MAX = 5_000_000;

/** MIME yang diterima model vision; sama dengan allowlist server. */
export const COVER_CAPTION_MIME_ALLOWLIST: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Gambar yang layak jadi sampul dan bisa dipratinjau browser. */
export const COVER_PICK_MIME_ALLOWLIST: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

/** Satu baris media dari `GET view=media` yang layak jadi sampul. */
export interface CoverLibraryItem {
  readonly id: string;
  readonly objectKey: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly altText: string | null;
  readonly caption: string | null;
  readonly version: number;
}

/**
 * Ambil nama berkas dari object key media.
 *
 * @param objectKey - Object key R2.
 * @returns Segmen terakhir, atau key apa adanya.
 */
export function fileNameOf(objectKey: string): string {
  const segments = objectKey.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? objectKey;
}

/**
 * Baca blob menjadi data URL base64.
 *
 * @param blob - Blob gambar sampul.
 * @returns Data URL siap kirim ke AI caption.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Gagal membaca gambar sampul.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Menyaring satu baris media pustaka menjadi kandidat sampul.
 *
 * @param value - Baris mentah dari respons `view=media`.
 * @returns Kandidat sampul; null bila bukan gambar aktif berversi.
 */
export function toCoverLibraryItem(value: unknown): CoverLibraryItem | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== 'string' || typeof row.objectKey !== 'string' || typeof row.mediaType !== 'string') return null;
  if (row.state !== 'active' || !COVER_PICK_MIME_ALLOWLIST.has(row.mediaType) || typeof row.version !== 'number') return null;
  return {
    id: row.id,
    objectKey: row.objectKey,
    mediaType: row.mediaType,
    sizeBytes: typeof row.sizeBytes === 'number' ? row.sizeBytes : 0,
    altText: typeof row.altText === 'string' ? row.altText : null,
    caption: typeof row.caption === 'string' ? row.caption : null,
    version: row.version,
  };
}
