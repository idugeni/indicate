/**
 * Palet mandiri Purple Digital Editorial (ungu).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const PURPLE_EDITORIAL = {
  primary: '#7c3aed',
  primaryDark: '#5f21d6',
  primarySoft: '#ede9fe',
  ink: '#1c1440',
  muted: '#5f5884',
  faint: '#9d94c2',
  canvas: '#f8f7ff',
  card: '#ffffff',
  ring: '#ddd3f8',
  scheme: 'light',
} as const;

const BADGE_STYLES = [
  { color: '#6d28d9', backgroundColor: '#ede9fe' },
  { color: '#0e7490', backgroundColor: '#cffafe' },
  { color: '#be123c', backgroundColor: '#ffe4e6' },
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
