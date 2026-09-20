import { format, formatDistance, startOfDay, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

function parseTanggal(iso: string): Date | null {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format tanggal kalender Indonesia untuk dasbor.
 *
 * @param iso - String tanggal ISO atau mentah dari API.
 * @returns Tanggal `d MMM yyyy` (id-ID); input tak valid dikembalikan apa adanya.
 */
export function formatTanggal(iso: string): string {
  const parsed = parseTanggal(iso);
  if (parsed === null) return iso;
  return format(parsed, 'd MMM yyyy', { locale: id });
}

/**
 * Format tanggal beserta jam untuk cap waktu dasbor.
 *
 * @param iso - String tanggal ISO atau mentah dari API.
 * @returns Tanggal `d MMM yyyy, HH.mm` (id-ID); input tak valid dikembalikan apa adanya.
 */
export function formatTanggalWaktu(iso: string): string {
  const parsed = parseTanggal(iso);
  if (parsed === null) return iso;
  return format(parsed, 'd MMM yyyy, HH.mm', { locale: id });
}

/**
 * Jarak waktu relatif terhadap kini untuk cap waktu dasbor.
 *
 * @param iso - String tanggal ISO atau mentah dari API.
 * @param now - Acuan waktu; default `new Date()` di production.
 * @returns Frasa seperti `3 jam lalu`; input tak valid dikembalikan apa adanya.
 */
export function formatRelatif(iso: string, now: Date = new Date()): string {
  const parsed = parseTanggal(iso);
  if (parsed === null) return iso;
  return formatDistance(parsed, now, { locale: id, addSuffix: true, includeSeconds: true });
}

export type PresetRentang = 'hari-ini' | '7-hari' | '30-hari';

export interface RentangIso {
  readonly from: string;
  readonly to: string;
}

/**
 * Rentang ISO siap filter analitik/telemetri dari satu preset.
 *
 * @param preset - Salah satu `hari-ini`, `7-hari`, atau `30-hari`.
 * @param now - Acuan waktu; default `new Date()` di production.
 * @returns Pasangan `from`/`to` ISO; `to` selalu waktu acuan.
 */
export function presetRentang(preset: PresetRentang, now: Date = new Date()): RentangIso {
  const to = now.toISOString();
  if (preset === 'hari-ini') return { from: startOfDay(now).toISOString(), to };
  const hari = preset === '7-hari' ? 6 : 29;
  return { from: startOfDay(subDays(now, hari)).toISOString(), to };
}
