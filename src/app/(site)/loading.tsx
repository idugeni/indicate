import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

import { Container } from '@/modules/site/components/layout/content';

/**
 * Site suspense skeleton (page content only; SiteShell comes from the group layout).
 * Full-viewport overlay: Next menahan posisi scroll selama navigasi tertunda, sehingga
 * tanpa overlay pengguna dari posisi bawah hanya melihat skeleton sepotong + footer.
 */
export default function SiteLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat halaman layanan"
      className="fixed inset-0 z-[100] overflow-y-auto bg-bg"
    >
      <div className="flex min-h-full flex-col justify-center py-16">
        <Container className="space-y-10">
          <div className="flex items-center gap-3" aria-hidden="true">
            <Spinner role="presentation" aria-hidden="true" className="h-4 w-4 text-brass" />
            <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">
              Memuat halaman…
            </p>
          </div>
          <div className="space-y-3" aria-hidden="true">
            <Skeleton className="h-3 w-24 bg-bg-raised-2" />
            <Skeleton className="h-8 w-2/3 bg-bg-raised-2" />
            <Skeleton className="h-4 w-full bg-bg-raised-2" />
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="border-t-2 border-hairline pt-4">
                <Skeleton className="h-4 w-2/3 bg-bg-raised-2" />
                <Skeleton className="mt-3 h-20 w-full bg-bg-raised-2" />
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
