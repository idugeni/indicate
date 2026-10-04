'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Muat ulang halaman artikel liveblog berkala agar entri baru tampil sendiri.
 *
 * @param intervalSeconds - Jeda muat ulang; 60 detik menyamai cache edge tenant.
 * @returns Tidak merender apa pun.
 * @remarks Melewati tab tersembunyi agar tidak memboroskan kuota; mengandalkan
 * cache 60 detik plus invalidasi `article.changed` sehingga refresh murah.
 */
export function LiveblogAutoRefresh({ intervalSeconds = 60 }: { readonly intervalSeconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (intervalSeconds <= 0) return;
    const id = window.setInterval(() => {
      if (!document.hidden) router.refresh();
    }, intervalSeconds * 1000);
    return () => window.clearInterval(id);
  }, [router, intervalSeconds]);
  return null;
}
