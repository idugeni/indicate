import type { NetworkArticle } from '@/modules/delivery/models';

const TIME_ZONE_ID = 'Asia/Jakarta';

/**
 * Resolve gambar utama artikel dengan fallback lokal.
 *
 * @param article - Artikel jaringan yang akan ditampilkan.
 * @returns URL thumbnail, gambar utama, atau fallback lokal.
 */
export function articleImage(article: NetworkArticle): string {
  return article.thumbnailUrl ?? article.imageUrl ?? '/assets/article-fallback.webp';
}

/**
 * Tentukan apakah src gambar adalah aset lokal same-origin.
 *
 * @param src - URL gambar yang diuji.
 * @returns True bila src diawali `/`.
 */
export function isLocalImageSrc(src: string): boolean {
  return src.startsWith('/');
}

/**
 * Judul bersih untuk ticker: buang ekor brand per situs ("— Sorotan …").
 *
 * @param article - Artikel yang diambil judul tampilnya.
 * @returns Judul tanpa ekor `—`/`–`/`|`; judul kanonis bila tanpa ekor.
 */
export function tickerHeadline(article: NetworkArticle): string {
  const title = article.title.trim();
  const pruned = title.replace(/\s+[—–|]\s+[^—–|]+$/, '').trim();
  return pruned === '' ? title : pruned;
}

/**
 * Format jam ticker gaya contoh (JJ.MM, tanpa detik).
 *
 * @param isoString - Timestamp ISO artikel.
 * @returns Jam terformat atau string asli bila gagal parse.
 */
export function tickerTime(isoString: string): string {
  try {
    const parsed = new Date(isoString);
    if (Number.isNaN(parsed.getTime())) return isoString;
    const parts = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: TIME_ZONE_ID,
    }).formatToParts(parsed);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
    return `${hour}.${minute}`;
  } catch {
    return isoString;
  }
}

/**
 * Hitung estimasi menit baca dari teks artikel.
 *
 * @param article - Artikel yang dihitung kata-katanya.
 * @returns Minimal 1 menit.
 */
export function readingMinutes(article: NetworkArticle): number {
  const words = (article.body || article.description || '').trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Format ringkas id-ID: 999, 1,2 rb, 3,4 jt. Selalu tampil termasuk nol.
 *
 * @param value - Jumlah view mentah.
 * @returns String kompak id-ID.
 */
export function formatCompactViews(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(Math.floor(value));
}

/**
 * Format angka penuh gaya id-ID: 79.300. Tanpa satuan tambahan.
 *
 * @param value - Jumlah view mentah.
 * @returns String angka penuh id-ID.
 */
export function formatFullViews(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.floor(value));
}

/**
 * Resolve nama penulis dengan fallback atribusi redaksi.
 *
 * @param article - Artikel yang dibaca nama penulisnya.
 * @returns Nama tampilan penulis.
 */
export function authorDisplayName(article: NetworkArticle): string {
  return article.authorDisplayName ?? article.authorName ?? article.attribution;
}

/**
 * Format tanggal ringkas id-ID gaya contoh ("14 Sep 2026").
 *
 * @param isoString - Timestamp ISO.
 * @param dateStyle - Gaya tanggal Intl.
 * @returns Tanggal terformat atau string asli bila gagal parse.
 */
export function formatDate(isoString: string, dateStyle: 'medium' | 'full' = 'medium'): string {
  try {
    const parsedDate = new Date(isoString);
    if (Number.isNaN(parsedDate.getTime())) return isoString;
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle,
      timeZone: TIME_ZONE_ID,
    }).format(parsedDate);
  } catch {
    return isoString;
  }
}
