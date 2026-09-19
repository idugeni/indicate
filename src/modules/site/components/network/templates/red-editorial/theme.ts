/**
 * Palet mandiri Red Editorial (merah serif).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const RED_EDITORIAL = {
  primary: '#b91c1c',
  primaryDark: '#7f1212',
  primarySoft: '#fbe3e3',
  maroon: '#7f1d1d',
  cream: '#fdf6ec',
  ink: '#230d0d',
  muted: '#705050',
  faint: '#ac9393',
  canvas: '#fffafa',
  card: '#ffffff',
  ring: '#ecd3d3',
} as const;

const BADGE_STYLES = [
  { color: '#991b1b', backgroundColor: '#fee2e2' },
  { color: '#854d0e', backgroundColor: '#fef9c3' },
  { color: '#0f766e', backgroundColor: '#ccfbf1' },
  { color: '#4d7c0f', backgroundColor: '#ecfccb' },
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
