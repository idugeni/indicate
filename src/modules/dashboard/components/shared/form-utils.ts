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

export function generateIdempotencyUuid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `pub-${Date.now()}`;
}