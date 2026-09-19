/**
 * Palet mandiri Warm Editorial (terakota serif).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const WARM_EDITORIAL = {
  primary: '#b4532a',
  primaryDark: '#8a3c1d',
  primarySoft: '#fae7d7',
  ink: '#231208',
  muted: '#6f5a4c',
  faint: '#ab9787',
  canvas: '#fdf7f0',
  card: '#ffffff',
  ring: '#e9d5c0',
} as const;

const BADGE_STYLES = [
  { color: '#9a3412', backgroundColor: '#ffedd5' },
  { color: '#166534', backgroundColor: '#dcfce7' },
  { color: '#854d0e', backgroundColor: '#fef9c3' },
  { color: '#0e7490', backgroundColor: '#cffafe' },
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
