/**
 * Palet mandiri Soft Blue Cards (biru lembut).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const SOFT_BLUE = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: '#dbeafe',
  ink: '#0e1b33',
  muted: '#51617a',
  faint: '#93a3c0',
  canvas: '#f1f6ff',
  card: '#ffffff',
  ring: '#d3e2fb',
  scheme: 'light',
} as const;

const BADGE_STYLES = [
  { color: '#1d4ed8', backgroundColor: '#dbeafe' },
  { color: '#047857', backgroundColor: '#d1fae5' },
  { color: '#7c3aed', backgroundColor: '#ede9fe' },
  { color: '#c2410c', backgroundColor: '#ffedd5' },
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
