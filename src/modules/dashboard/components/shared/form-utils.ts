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