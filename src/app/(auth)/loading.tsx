/**
 * Fallback pemuatan untuk empat halaman autentikasi.
 *
 * @remarks Cangkang `(auth)/layout.tsx` berpermukaan krem `#f4f2ec` dengan tinta
 * `#1a2430`. Tanpa berkas ini grup ini jatuh ke `src/app/loading.tsx`, yang
 * sengaja memakai `bg-bg` gelap agar tidak pernah bertentangan dengan palet
 * tenant — artinya auth akan berkedip gelap indigo sebelum krem-nya ter-cat.
 * Loader ini meniru permukaan auth-nya sendiri, mengikuti pola yang sama dengan
 * `(dashboard)/loading.tsx` dan `status/loading.tsx`.
 */
export default function AuthLoading() {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Memuat"
      className="fixed inset-0 z-[100] grid place-items-center bg-[#f4f2ec] text-[#1a2430] [color-scheme:light] [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    >
      <div aria-hidden="true" className="relative h-28 w-28">
        <div className="absolute -inset-3 animate-pulse rounded-full bg-current opacity-20 blur-xl" />
        <div className="absolute -inset-1.5 animate-spin rounded-full bg-[conic-gradient(from_0deg,transparent_10%,currentColor_45%,color-mix(in_srgb,currentColor_55%,transparent)_55%,transparent_90%)]" />
        <div className="absolute inset-0 rounded-full bg-[#f4f2ec]" />
        <div className="absolute inset-0 m-auto h-5 w-5 animate-pulse rounded-full bg-current" />
      </div>
    </div>
  );
}