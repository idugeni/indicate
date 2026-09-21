import { Skeleton } from '@/components/ui/skeleton';

import { Container } from '@/modules/site/components/layout/content';

/**
 * Site suspense skeleton (page content only; SiteShell comes from the group layout).
 * Full-viewport overlay: Next holds the scroll position during pending navigation, so
 * without the overlay users starting from below only see a partial skeleton + footer.
 */
export default function SiteLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Memuat halaman layanan"
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#f4f2ec] [padding:env(safe-area-inset-top)_env(safe-area-inset-right)_env(safe-area-inset-bottom)_env(safe-area-inset-left)]"
    >
      <div className="flex min-h-full flex-col justify-center py-16">
        <Container className="space-y-10">
          <div className="grid gap-10 rounded-[3px] bg-[#1a2430] p-6 lg:grid-cols-12" aria-hidden="true">
            <div className="space-y-3 lg:col-span-7">
              <Skeleton className="h-3 w-24 bg-white/15" />
              <Skeleton className="h-8 w-2/3 bg-white/15" />
              <Skeleton className="h-4 w-full bg-white/10" />
            </div>
            <div className="rounded-[3px] border border-white/10 p-6 lg:col-span-5">
              <Skeleton className="h-3 w-full bg-white/10" />
              <Skeleton className="mt-3 h-3 w-5/6 bg-white/10" />
              <Skeleton className="mt-6 h-9 w-full bg-white/15" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="rounded-[3px] border border-[#e2ded2] bg-white p-4">
                <Skeleton className="h-4 w-2/3 bg-[#e7e3d6]" />
                <Skeleton className="mt-3 h-20 w-full bg-[#e7e3d6]" />
              </div>
            ))}
          </div>
        </Container>
      </div>
    </div>
  );
}
