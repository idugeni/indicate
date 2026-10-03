/**
 * Segmen jaringan tanpa fallback visual.
 *
 * @returns Null, selalu.
 * @remarks Kehadiran berkas ini disengaja: tanpa `loading.tsx` sendiri, segmen
 * `(network)` mewarisi `src/app/loading.tsx` milik domain utama, sehingga
 * spinner netral itu bocor ke 10 template tenant. Dengan mengembalikan null,
 * tidak ada overlay pemuatan template maupun domain utama yang pernah
 * ter-cat di rute tenant.
 */
export default function PublicLoading(): null {
  return null;
}
