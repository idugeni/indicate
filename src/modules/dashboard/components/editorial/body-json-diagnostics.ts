import { validateTipTapDoc } from '@/modules/site/tiptap-document';

/**
 * Alasan `validateTipTapDoc` yang bisa muncul saat redakteur menekan Simpan,
 * dipetakan ke kalimat yang menyebut bagian yang harus diperbaiki.
 */
const REASON_MESSAGES: Readonly<Record<string, string>> = {
  'not-a-doc': 'Struktur isi artikel tidak terbaca. Muat ulang editor lalu tulis ulang bagian ini.',
  'too-many-nodes': 'Isi artikel terlalu banyak blok. Pisah menjadi beberapa artikel.',
  'too-deep': 'Ada daftar atau tabel yang terlalu dalam. Ratakan strukturnya.',
  'text-too-long': 'Isi artikel melebihi batas 200.000 karakter.',
  'text-without-string': 'Ada potongan teks yang rusak di dalam editor. Tulis ulang bagian itu.',
  'unsupported-mark': 'Ada format teks yang belum didukung. Hapus format tersebut.',
  'unsafe-link': 'Ada tautan yang tidak aman di dalam isi. Gunakan alamat http atau https.',
  'invalid-text-color': 'Warna teks bukan format hex yang valid, misalnya #b91c1c.',
  'invalid-heading-level': 'Level judul bagian tidak valid.',
  'invalid-text-align': 'Perataan teks bukan rata kiri, tengah, kanan, atau rata kanan-kiri.',
  'invalid-table-size': 'Tabel melebihi batas 30 baris atau 12 kolom.',
  'invalid-table-shape': 'Struktur tabel tidak lengkap.',
  'unsafe-image-src': 'Ada gambar dengan sumber yang tidak diizinkan.',
  'invalid-image-alt': 'Teks alt gambar melebihi 300 karakter.',
  'invalid-image-caption': 'Keterangan gambar melebihi 500 karakter.',
  'invalid-youtube-ref': 'Tautan video YouTube tidak valid.',
  'invalid-drive-ref': 'Tautan Google Drive tidak valid.',
};

/**
 * Periksa dokumen kaya di sisi peramban sebelum dikirim ke server.
 *
 * @param value - Dokumen TipTap yang sedang disusun; `null` berarti editor kosong.
 * @returns Kalimat siap tampil dalam bahasa Indonesia, atau null bila valid.
 * @remarks Server tetap memvalidasi ulang dengan fungsi yang sama. Pemeriksaan
 * di sini hanya memindahkan umpan balik dari "gagal setelah menekan Simpan"
 * menjadi "kelihatan saat masih menulis", sehingga satu kelas kesalahan tidak
 * lagi bergantung pada round-trip untuk ditemukan.
 */
export function describeBodyJsonProblem(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const result = validateTipTapDoc(value);
  if (result.ok) return null;
  const known = REASON_MESSAGES[result.reason];
  if (known !== undefined) return known;
  const node = result.reason.startsWith('unsupported-node:') ? result.reason.slice('unsupported-node:'.length) : null;
  if (node !== null) return `Elemen "${node}" tidak dikenal dan tidak bisa disimpan.`;
  if (result.reason.startsWith('invalid-') && result.reason.endsWith('-ref')) {
    return `Tautan ${result.reason.slice('invalid-'.length, -'-ref'.length)} tidak valid atau bukan URL kanonis.`;
  }
  return 'Struktur isi artikel tidak valid. Coba muat ulang editor lalu tulis ulang bagian ini.';
}
