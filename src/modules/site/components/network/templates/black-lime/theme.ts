/**
 * Palet mandiri Black Lime Pulse (dark + lime).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const BLACK_LIME = {
  primary: '#c5f82a',
  primaryDark: '#9ecb14',
  primarySoft: '#22300a',
  ink: '#f2f5e9',
  muted: '#a3ad9a',
  faint: '#646b5e',
  canvas: '#0a0c07',
  card: '#131711',
  ring: '#242b1f',
  onPrimary: '#0a0c07',
  scheme: 'dark',
} as const;

const BADGE_STYLES = [
  { color: '#d9f99d', backgroundColor: '#1a2e05' },
  { color: '#e9d5ff', backgroundColor: '#3b0764' },
  { color: '#fed7aa', backgroundColor: '#431407' },
  { color: '#bfdbfe', backgroundColor: '#172554' },
] as const;

/**
 * Ambil gaya badge kategori berdasarkan indeks.
 *
 * @param index - Posisi kartu dalam daftar.
 * @returns Pasangan warna teks dan latar badge.
 */
export function badgeStyle(index: number): { readonly color: string; readonly backgroundColor: string } {
  const pick = BADGE_STYLES[index % BADGE_STYLES.length] ?? BADGE_STYLES[0];
  return { color: pick.color, backgroundColor: pick.backgroundColor };
}
