import { DashboardContentSkeleton } from '@/modules/dashboard/components/dashboard-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/** Dashboard suspense skeleton mirroring the workspace frame so streaming swaps content without layout shift. */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen animate-in bg-bg text-paper antialiased fade-in duration-200" aria-busy="true" aria-label="Memuat ruang redaksi">
      <aside aria-hidden="true" className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-hairline bg-bg-raised/40 md:flex">
        <div className="flex h-12 flex-none items-center gap-2 border-b border-hairline px-3">
          <Skeleton className="h-7 w-7 rounded-md bg-bg-raised-2" />
          <Skeleton className="h-4 w-24 bg-bg-raised-2" />
        </div>
        <div className="flex-none border-b border-hairline p-3">
          <Skeleton className="h-3 w-20 bg-bg-raised-2" />
          <Skeleton className="mt-2 h-8 w-full bg-bg-raised-2" />
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-hidden p-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={n} className="h-8 w-full rounded-md bg-bg-raised-2" />
          ))}
        </div>
        <div className="flex-none border-t border-hairline p-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-full bg-bg-raised-2" />
            <Skeleton className="h-4 w-24 bg-bg-raised-2" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 flex-none items-center gap-2 border-b border-hairline bg-bg px-4 sm:px-6">
          <Skeleton className="h-4 w-40 bg-bg-raised-2" />
          <div className="ml-auto flex items-center gap-1.5">
            <Skeleton className="h-9 w-9 rounded-md bg-bg-raised-2" />
            <Skeleton className="h-9 w-9 rounded-md bg-bg-raised-2" />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <div aria-hidden="true">
              <Skeleton className="h-3 w-32 bg-bg-raised-2" />
              <Skeleton className="mt-2 h-6 w-64 bg-bg-raised-2" />
              <Skeleton className="mt-2 h-4 w-96 max-w-full bg-bg-raised-2" />
            </div>
            <div className="pt-6">
              <DashboardContentSkeleton />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
