/**
 * Render fallback pemuatan tanpa brand tenant.
 *
 * @remarks Dipakai hanya saat host tidak ter-resolve menjadi satu situs tenant
 * aktif atau saat pembacaan branding gagal, jadi palet dashboard lama tidak
 * boleh ikut terpasang: `bg-bg`/`text-paper` di sini adalah permukaan cangkang
 * yang sama persis dengan `<body>` di `src/app/layout.tsx`, sehingga loader ini
 * menyatu dengan sel yang belum ter-cat alih-alih menimpa tenant yang sedang
 * merender, dan flash krem pada tenant gelap hilang. Cincin memakai
 * `currentColor` supaya satu-satunya sumber warna tetap token cangkang dan tidak
 * ada satu pun hex yang bisa bertentangan dengan palet mana pun.
 */
export default function RootLoading() {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Memuat"
      className="fixed inset-0 z-[100] grid place-items-center bg-bg text-paper [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    >
      <div aria-hidden="true" className="relative h-28 w-28">
        <div className="absolute -inset-3 animate-pulse rounded-full bg-current opacity-20 blur-xl" />
        <div className="absolute -inset-1.5 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_10%,currentColor_45%,color-mix(in_srgb,currentColor_55%,transparent)_55%,transparent_90%)]" />
        <div className="absolute inset-0 rounded-full bg-bg" />
        <div className="absolute inset-0 m-auto h-5 w-5 animate-pulse rounded-full bg-current" />
      </div>
    </div>
  );
}
