/**
 * Buat slug draf untuk pratampil formulir dashboard.
 *
 * @param input - Teks bebas dari kolom nama/judul.
 * @returns Slug draf; string kosong bila masukan kosong agar kolom tidak terisi otomatis.
 * @remarks Domain formulir: garis bawah dipertahankan dan kekosongan dipertahankan.
 * Normalisasi kanonis DB (`normalizeSlugCandidate`) diterapkan di lapisan alokasi.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}

/**
 * Samakan dua nama kategori untuk deteksi duplikat.
 *
 * @param input - Nama kategori bebas (mis. "R&D", "  Berita  Utama ").
 * @returns Kunci kanonis huruf kecil tanpa tanda baca; `&` dibaca "dan".
 * @remarks "Berita Utama", "berita  utama", dan "BERITA&UTAMA" menghasilkan kunci sama.
 */
export function normalizeCategoryKey(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Cari kategori existing yang sudah mewakili satu nama baru.
 *
 * @param categories - Daftar kategori tenant (id + nama).
 * @param name - Nama kategori yang hendak ditambahkan.
 * @returns Id kategori yang cocok, atau null bila benar-benar baru.
 */
export function findMatchingCategoryId(
  categories: readonly { readonly id: string; readonly name: string }[],
  name: string,
): string | null {
  const key = normalizeCategoryKey(name);
  if (key === '') return null;
  return categories.find((c) => normalizeCategoryKey(c.name) === key)?.id ?? null;
}

export function generateIdempotencyUuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pub-${Date.now()}`;
}

/**
 * Konversi nilai `datetime-local` browser menjadi timestamp ISO UTC.
 *
 * @param value - Nilai lokal `YYYY-MM-DDTHH:mm` dari input browser.
 * @returns Timestamp ISO UTC, atau null bila kosong atau tidak valid.
 */
export function localDateTimeToIso(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Ubah timestamp ISO menjadi format input datetime-local pada timezone browser.
 *
 * @param value - Timestamp ISO dari server.
 * @returns Nilai `YYYY-MM-DDTHH:mm`, atau string kosong bila tidak valid.
 */
export function isoToLocalDateTimeInput(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === '') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
