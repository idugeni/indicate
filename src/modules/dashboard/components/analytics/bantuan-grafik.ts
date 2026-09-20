import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export const WARNA_TERBIT = '#5fcbb0';
export const WARNA_GAGAL = '#d9705f';
export const WARNA_ANTRE = '#d8a94e';

/**
 * Palet kategorikal 12 warna untuk visual dashboard di atas latar gelap.
 *
 * @remarks Urutan disusun selang-seling rona (kuningan, hijau, biru, koral,
 * ungu, …) agar segmen bersebelahan selalu kontras. Enam warna pertama
 * mewarisi token dan grafik yang sudah ada; enam sisanya melengkapi hingga
 * 12 kategori tanpa mengulang. Indeks di luar rentang dibungkus modulo
 * lewat `warnaKategori`.
 */
export const PALET_KATEGORI: readonly string[] = [
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
 * @param indeks - Posisi kategori (peringkat, urutan simpul, dsb).
 * @returns Hex palet; indeks negatif atau besar dibungkus modulo.
 */
export function warnaKategori(indeks: number): string {
  const palet = PALET_KATEGORI;
  const posisi = ((Math.trunc(indeks) % palet.length) + palet.length) % palet.length;
  return palet[posisi] ?? '#8b93a7';
}

/**
 * Label sumbu kalender Indonesia dari hari `YYYY-MM-DD` (UTC).
 *
 * @param hari - Hari ISO tanpa jam.
 * @returns Label `d MMM` (id-ID); input tak valid dikembalikan apa adanya.
 */
export function labelHari(hari: string): string {
  const tanggal = new Date(`${hari}T00:00:00Z`);
  if (Number.isNaN(tanggal.getTime())) return hari;
  return format(tanggal, 'd MMM', { locale: id });
}

/**
 * Potong label kategori panjang untuk sumbu dan legenda.
 *
 * @param nilai - Label mentah (mis. ID situs).
 * @param batas - Panjang maksimum sebelum elipsis; default 20.
 * @returns Label terpotong dengan `…` bila melebihi batas.
 */
export function potongLabel(nilai: string, batas = 20): string {
  return nilai.length > batas ? `${nilai.slice(0, batas - 1)}…` : nilai;
}
