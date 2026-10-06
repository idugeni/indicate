/**
 * Nonaktifkan fallback pemuatan segmen tenant.
 *
 * @returns Null agar pindah antar-halaman tenant tidak menampilkan apa pun:
 * konten lama langsung diganti konten baru saat siap, tanpa overlay, tanpa
 * spinner, tanpa kerangka. Kanvas body selama jeda dipegang skrip cat
 * `__indicateCanvas` di `src/app/layout.tsx` (warna cookie per host) +
 * `body:has([data-template])` di `globals.css`.
 */
export default function PublicLoading() {
  return null;
}
