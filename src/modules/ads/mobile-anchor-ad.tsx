'use client';

import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Jangkar iklan bawah khusus ponsel: menempel saat menggulir, bisa ditutup.
 *
 * @param children - Slot iklan khusus ponsel (mis. `mobile-banner`).
 * @returns Bilah bawah tetap di ponsel; null setelah ditutup atau di desktop/cetak.
 * @remarks Sticky (bukan fixed) agar bilah menyisakan ruang alir di akhir
 * halaman dan tidak menutup footer; margin ritme slot dinetralkan di sini.
 */
export function MobileAnchorAd({ children }: { readonly children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="sticky inset-x-0 bottom-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden print:hidden">
      <div className="relative mx-auto w-full min-w-0 [&_[data-ad-slot]]:my-0" style={{ maxWidth: 420 }}>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Tutup iklan"
          className="absolute -top-3 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tpl-ink,#0f172a)] text-white shadow-md"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
