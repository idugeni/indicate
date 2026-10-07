import type { PublicationStatusProjection } from '@/modules/publishing/models';

/**
 * Memecah daftar site ID menjadi batch untuk menghindari limitasi payload.
 * 
 * @param siteIds - Daftar lengkap site ID tujuan publikasi.
 * @param batchSize - Jumlah maksimal site ID per batch (default 100).
 * @returns Array berisi array of strings (site ID per batch).
 */
export function chunkPublicationTargets(siteIds: readonly string[], batchSize = 100): string[][] {
  const results: string[][] = [];
  for (let i = 0; i < siteIds.length; i += batchSize) {
    results.push([...siteIds.slice(i, i + batchSize)]);
  }
  return results;
}

/**
 * Memeriksa apakah sekumpulan hasil batch publikasi dianggap berhasil secara keseluruhan.
 * 
 * @param results - Satu atau lebih proyeksi status publikasi.
 * @returns True jika setidaknya ada satu job yang berhasil atau sedang diproses.
 */
export function isBatchSuccess(results: PublicationStatusProjection | readonly PublicationStatusProjection[]): boolean {
  const list = Array.isArray(results) ? results : [results];
  return list.some((res) => res.job.state !== 'failed');
}
