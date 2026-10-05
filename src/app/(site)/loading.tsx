/**
 * Nonaktifkan fallback pemuatan halaman publik domain utama.
 *
 * @returns Null agar navigasi antar halaman `(site)` tidak menampilkan overlay.
 * @remarks Boundary ini menaungi semua halaman `(site)` async (`faq`,
 * `network`, `partners`, `pricing`): selama halaman menunggu data, tidak ada
 * kerangka visual yang ter-cat — konten tampil saat siap.
 */
export default function SiteLoading() {
  return null;
}
