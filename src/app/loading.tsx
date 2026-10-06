/**
 * Nonaktifkan fallback pemuatan root.
 *
 * @returns Null agar tidak ada spinner layar penuh di permukaan mana pun:
 * segmen yang butuh fallback memilikinya sendiri (`(network)`, `(dashboard)`,
 * `(auth)`, `status`), dan halaman utama control-plane me-render cangkang
 * statis instan dengan seksi dinamis ber-fallback `null`. Riwayat: cincin
 * conic + dot di sini pernah bocor sebagai fallback induk ke 134 tenant.
 */
export default function RootLoading() {
  return null;
}
