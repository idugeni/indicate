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

/**
 * Kumpulkan id media inline dari dokumen TipTap.
 *
 * @param doc - Dokumen TipTap naskah (null saat kosong).
 * @returns Id unik `media/<uuid>` yang dirujuk node gambar dan galeri, maksimal 24.
 */
export function collectInlineMediaIds(doc: unknown): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const collectSrc = (src: unknown): void => {
    if (typeof src !== 'string') return;
    const match = /\/api\/network\/media\/([0-9a-fA-F-]{36})/.exec(src);
    if (match?.[1] !== undefined && !seen.has(match[1])) {
      seen.add(match[1]);
      ids.push(match[1]);
    }
  };
  const visit = (node: unknown): void => {
    if (typeof node !== 'object' || node === null) return;
    const record = node as { readonly type?: unknown; readonly attrs?: unknown; readonly content?: unknown };
    if ((record.type === 'image' || record.type === 'imageGallery') && typeof record.attrs === 'object' && record.attrs !== null) {
      const attrs = record.attrs as Readonly<Record<string, unknown>>;
      collectSrc(attrs.src);
      if (Array.isArray(attrs.images)) {
        for (const item of attrs.images) {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            collectSrc((item as Readonly<Record<string, unknown>>).src);
          }
        }
      }
    }
    if (Array.isArray(record.content)) for (const child of record.content) visit(child);
    if (ids.length >= 24) return;
  };
  const root = (doc as { readonly content?: unknown } | null)?.content;
  if (Array.isArray(root)) for (const child of root) visit(child);
  return ids;
}

/**
 * Temukan media ter-embed yang pemiliknya beda dari org artikel.
 *
 * @param present - Id media yang masih dipakai (sampul + inline yang ada di draf).
 * @param orgByMediaId - Org tercatat saat tiap media diunggah/dipilih.
 * @param articleOrg - Org efektif artikel; string kosong berarti belum tentu.
 * @returns Id asing yang perlu peringatan; kosong berarti semua selaras.
 */
export function findForeignMediaIds(
  present: readonly string[],
  orgByMediaId: Readonly<Record<string, string | null>>,
  articleOrg: string,
): string[] {
  if (articleOrg === '') return [];
  return present.filter((id) => {
    const owner = orgByMediaId[id] ?? null;
    return owner !== null && owner !== articleOrg;
  });
}

/**
 * Nilai awal artikel existing untuk mode ubah composer.
 *
 * @remarks Subset `ArticleRecord` yang dipakai mengisi state form; `version`
 * dipakai sebagai `expectedVersion` dan disegarkan dari hasil `article.update`.
 */
export interface EditArticleInit {
  readonly id: string;
  readonly version: number;
  readonly regionId: string | null;
  readonly publisherId: string | null;
  readonly categoryIds: readonly string[];
  readonly authorId: string | null;
  readonly leadMediaId: string | null;
  readonly coverImageUrl: string | null;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string | null;
  readonly canonicalUrl: string | null;
  readonly body: string;
  readonly bodyJson: unknown | null;
  readonly source: string;
  readonly tags: readonly string[];
  readonly status: string;
  readonly type: string;
  readonly isSponsored: boolean;
  readonly videoUrl: string | null;
  readonly audioUrl: string | null;
  readonly durationSeconds: number | null;
  readonly scheduledAt: string | null;
}
