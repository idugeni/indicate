'use cache';

import { cacheLife } from 'next/cache';

/**
 * Tahun kalender (UTC) untuk footer. Nilai waktu-nyata tidak boleh di-render
 * langsung saat prerender (blocking-prerender-current-time), jadi hasilnya
 * di-cache harian: sama untuk semua pembaca hingga revalidasi.
 *
 * Direktif di level file (bukan inline) agar modul tetap bisa diimpor dari
 * rantai komponen yang juga masuk client bundle (form auth memakai primitif
 * dari auth-ui yang mengimpor BrandPanel).
 */
export async function currentYear(): Promise<number> {
  cacheLife('days');
  return new Date().getUTCFullYear();
}
