import { cookies } from 'next/headers';

import { overlayForTemplate } from '@/modules/site/components/template-memory';

/**
 * Overlay pemuatan segmen tenant.
 *
 * @returns Overlay opak penuh yang menutup cangkang gelap root.
 * @remarks Tanpa berkas ini segmen `(network)` mewarisi `src/app/loading.tsx`
 * milik domain utama sehingga spinner gelap bocor ke 10 template tenant.
 * Mengembalikan `null` juga bocor: saat halaman async menunggu
 * `resolveNetworkSite`, lubang suspense menampilkan `body bg-bg #0e1320`
 * milik `src/app/layout.tsx`. Warna overlay mengikuti cookie
 * `indicate-template` (ditulis `TemplateMemory` per host) agar portal gelap
 * tidak kena kilat terang; kunjungan pertama atau cookie asing jatuh ke
 * netral terang `#f5f8fd` (median 8 template terang, sama dengan
 * `(network)/error.tsx`).
 */
export default async function PublicLoading() {
  const cookieStore = await cookies();
  const backgroundColor = overlayForTemplate(cookieStore.get('indicate-template')?.value ?? null);
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Memuat"
      style={{ backgroundColor }}
      className="fixed inset-0 z-[100] [color-scheme:light]"
    />
  );
}
