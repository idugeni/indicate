import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const COLOR_PUBLISHED = '#5fcbb0';
export const COLOR_FAILED = '#d9705f';
export const COLOR_QUEUED = '#d8a94e';

/**
 * Palet kategorikal 12 warna untuk visual dashboard di atas latar gelap.
 *
 * @remarks Urutan disusun selang-seling rona (kuningan, hijau, biru, koral,
 * ungu, …) agar segmen bersebelahan selalu kontras. Enam warna pertama
 * mewarisi token dan grafik yang sudah ada; enam sisanya melengkapi hingga
 * 12 kategori tanpa mengulang. Indeks di luar rentang dibungkus modulo
 * lewat `categoryColor`.
 */
export const CATEGORY_PALETTE: readonly string[] = [
  '#cc9a44',
  '#5fcbb0',
  '#6c93c9',
  '#d9705f',
  '#9d7bd8',
  '#d8a94e',
  '#4fb3a9',
  '#e08bb8',
  '#7ec850',
  '#5aa9e6',
  '#e6c15a',
  '#b8b8d0',
];

/**
 * Ambil warna kategori deterministik dari palet berdasarkan indeks.
 *
 * @param index - Posisi kategori (peringkat, urutan simpul, dsb).
 * @returns Hex palet; indeks negatif atau besar dibungkus modulo.
 */
export function categoryColor(index: number): string {
  const palette = CATEGORY_PALETTE;
  const position = ((Math.trunc(index) % palette.length) + palette.length) % palette.length;
  return palette[position] ?? '#8b93a7';
}

/**
 * Label sumbu kalender Indonesia dari hari `YYYY-MM-DD` (UTC).
 *
 * @param day - Hari ISO tanpa jam.
 * @returns Label `d MMM` (id-ID); input tak valid dikembalikan apa adanya.
 */
export function weekdayLabel(day: string): string {
  const tanggal = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(tanggal.getTime())) return day;
  return format(tanggal, 'd MMM', { locale: id });
}

/**
 * Potong label kategori panjang untuk sumbu dan legenda.
 *
 * @param value - Label mentah (mis. ID situs).
 * @param max - Panjang maksimum sebelum elipsis; default 20.
 * @returns Label terpotong dengan `…` bila melebihi batas.
 */
export function truncateLabel(value: string, max = 20): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
