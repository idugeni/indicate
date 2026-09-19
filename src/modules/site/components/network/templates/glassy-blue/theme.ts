/**
 * Palet mandiri Glassy Blue (kaca biru terang).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const GLASSY_BLUE = {
  primary: '#1f7cff',
  primaryDark: '#155fd0',
  primarySoft: '#e3efff',
  ink: '#0e1b33',
  muted: '#51617a',
  faint: '#93a3c0',
  canvas: '#edf4ff',
  card: '#ffffff',
  ring: '#d6e5fb',
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
