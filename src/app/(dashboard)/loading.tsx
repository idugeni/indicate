import { DashboardContentSkeleton } from '@/modules/dashboard/components/dashboard-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/** Dashboard suspense skeleton mirroring the workspace frame so streaming swaps content without layout shift. */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg text-paper antialiased" aria-busy="true" aria-label="Memuat ruang redaksi">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-hairline bg-bg px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 bg-bg-raised-2" aria-hidden="true" />
          <Skeleton className="h-4 w-32 bg-bg-raised-2" aria-hidden="true" />
        </div>
        <Skeleton className="h-7 w-7 bg-bg-raised-2" aria-hidden="true" />
      </header>

      <div className="grid min-h-[calc(100vh-3.25rem)] grid-cols-1 md:grid-cols-[15rem_minmax(0,1fr)]">
        <nav aria-hidden="true" className="hidden border-r border-hairline py-5 pr-3 md:block">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="mb-2 h-8 border-l-2 border-hairline bg-transparent" />
          ))}
        </nav>

        <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10">
          <div className="border-b border-hairline pb-5" aria-hidden="true">
            <Skeleton className="h-3 w-40 bg-bg-raised-2" />
            <Skeleton className="mt-2 h-7 w-64 bg-bg-raised-2" />
          </div>
          <div className="pt-6">
            <DashboardContentSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}
