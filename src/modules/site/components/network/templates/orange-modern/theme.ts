/**
 * Palet mandiri Orange Modern (oranye).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const ORANGE_MODERN = {
  primary: '#ea580c',
  primaryDark: '#c2410c',
  primarySoft: '#ffedd5',
  ink: '#220f04',
  muted: '#71564a',
  faint: '#a8988b',
  canvas: '#fff9f4',
  card: '#ffffff',
  ring: '#f2dcc9',
  scheme: 'light',
} as const;

const BADGE_STYLES = [
  { color: '#c2410c', backgroundColor: '#ffedd5' },
  { color: '#0e7490', backgroundColor: '#cffafe' },
  { color: '#4d7c0f', backgroundColor: '#ecfccb' },
  { color: '#7c2d12', backgroundColor: '#ffedd5' },
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
