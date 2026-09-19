/**
 * Palet mandiri Dark Navy Modern (dark navy + biru).
 *
 * @remarks
 * Ditanggung template langsung, bukan `site_settings.colors`. Disengaja
 * mengabaikan variabel `--site-*` agar tampil persis seperti contoh dalam
 * segala kondisi, termasuk di bawah root `<html class="dark">`.
 */
export const DARK_NAVY = {
  primary: '#2f7bff',
  primaryDark: '#1a5fd0',
  primarySoft: '#14294f',
  ink: '#eaf0fb',
  muted: '#9aa9c4',
  faint: '#5f6f8c',
  canvas: '#070f22',
  card: '#0e1a33',
  ring: '#1b2c4f',
} as const;

const BADGE_STYLES = [
  { color: '#bfdbfe', backgroundColor: '#172554' },
  { color: '#ddd6fe', backgroundColor: '#2e1065' },
  { color: '#fed7aa', backgroundColor: '#431407' },
  { color: '#a5f3fc', backgroundColor: '#083344' },
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
