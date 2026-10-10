'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Iklan khusus ponsel yang tetap berada di alur dokumen, bukan menempel
 * pada viewport saat pengguna menggulir.
 *
 * @param children - Slot iklan khusus ponsel (mis. `mobile-banner`).
 * @returns Slot iklan inline di ponsel; null setelah ditutup atau di desktop/cetak.
 * @remarks Jangan gunakan sticky/fixed positioning di sini: bar yang kosong
 * atau lambat diisi provider dapat menutupi konten dan tampak sebagai pita
 * menetap di bagian bawah layar saat scrolling.
 */
export function MobileAnchorAd({ children }: { readonly children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="relative w-full min-w-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden print:hidden">
      <div className="relative mx-auto w-full min-w-0 [&_[data-ad-slot]]:my-0">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup iklan"
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tpl-ink,#0f172a)] text-white shadow-md"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
