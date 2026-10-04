/**
 * Overlay pemuatan segmen tenant.
 *
 * @returns Overlay terang penuh yang menutup cangkang gelap root.
 * @remarks Tanpa berkas ini segmen `(network)` mewarisi `src/app/loading.tsx`
 * milik domain utama sehingga spinner gelap bocor ke 10 template tenant.
 * Mengembalikan `null` juga bocor: saat halaman async menunggu
 * `resolveNetworkSite`, lubang suspense menampilkan `body bg-bg #0e1320`
 * milik `src/app/layout.tsx`. Overlay opak `#f5f8fd` menutup lubang itu tanpa
 * membaca DB — `templateId` baru diketahui setelah halaman resolve, jadi satu
 * warna netral (median 8 template terang, sama dengan `(network)/error.tsx`)
 * adalah yang termurah. Dua template gelap menerima kilat terang-ke-gelap
 * sekali; presisi per-template butuh ingatan klien dan bukan biaya server.
 */
export default function PublicLoading() {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Memuat"
      className="fixed inset-0 z-[100] bg-[#f5f8fd] [color-scheme:light]"
    />
  );
}
