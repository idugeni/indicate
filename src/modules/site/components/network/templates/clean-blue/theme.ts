/**
 * Palet mandiri Clean Blue Editorial.
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const CLEAN_BLUE = {
  primary: '#1a5fd0',
  primaryDark: '#155cb8',
  primarySoft: '#e8f0fe',
  ink: '#0f172a',
  muted: '#475569',
  faint: '#94a3b8',
  canvas: '#f5f8fd',
  card: '#ffffff',
  ring: '#e2e8f0',
  scheme: 'light',
} as const;

const BADGE_STYLES = [
  { color: '#15803d', backgroundColor: '#dcfce7' },
  { color: '#6d28d9', backgroundColor: '#ede9fe' },
  { color: '#c2410c', backgroundColor: '#ffedd5' },
  { color: '#1d4ed8', backgroundColor: '#dbeafe' },
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
