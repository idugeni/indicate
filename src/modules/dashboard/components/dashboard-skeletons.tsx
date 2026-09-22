import { Skeleton } from '@/components/ui/skeleton';

function ShimmerShell({
  label,
  rhythm,
  children,
}: {
  readonly label: string;
  readonly rhythm: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className={`animate-in fade-in duration-200 ${rhythm}`} aria-busy="true" aria-label={label} role="status">
      {children}
    </div>
  );
}

/** Form fallback mirroring SectionCard chrome (eyebrow + title + h-8 fields). */
export function DashboardFormSkeleton() {
  return (
    <ShimmerShell label="Memuat formulir" rhythm="space-y-6">
      <div className="rounded-lg border border-hairline bg-bg-raised p-5" aria-hidden="true">
        <Skeleton className="h-3 w-24 bg-bg-raised-2" />
        <Skeleton className="mt-2 h-5 w-40 bg-bg-raised-2" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 bg-bg-raised-2" />
            <Skeleton className="h-8 w-full bg-bg-raised-2" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 bg-bg-raised-2" />
            <Skeleton className="h-8 w-full bg-bg-raised-2" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Skeleton className="h-3 w-20 bg-bg-raised-2" />
            <Skeleton className="h-20 w-full bg-bg-raised-2" />
          </div>
        </div>
      </div>
    </ShimmerShell>
  );
}

/** Stats fallback mirroring the 8 metric boxes (icon + label, mono value). */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <div key={index} className="rounded-lg border border-hairline bg-bg-raised p-5">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 bg-bg-raised-2" />
            <Skeleton className="h-3 w-20 bg-bg-raised-2" />
          </div>
          <Skeleton className="mt-1.5 h-6 w-24 bg-bg-raised-2" />
        </div>
      ))}
    </div>
  );
}

/** Panel fallback mirroring setup/jobs sections (header + 4 status rows). */
export function DashboardPanelSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <Skeleton className="h-4 w-40 bg-bg-raised-2" />
        <Skeleton className="h-3 w-20 bg-bg-raised-2" />
      </div>
      <div>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="flex items-center gap-2 border-b border-hairline/60 py-2.5 last:border-0">
            <Skeleton className="h-2 w-2 flex-none rounded-full bg-bg-raised-2" />
            <Skeleton className="h-3.5 min-w-0 flex-1 bg-bg-raised-2" />
            <Skeleton className="h-3 w-10 flex-none bg-bg-raised-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Table fallback mirroring one collection section (card + header + thead + 5 rows). */
export function DashboardTableSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <Skeleton className="h-4 w-40 bg-bg-raised-2" />
        <Skeleton className="h-3 w-24 bg-bg-raised-2" />
      </div>
      <div className="flex items-center gap-3 border-b border-hairline py-2.5">
        <Skeleton className="h-3 flex-1 bg-bg-raised-2" />
        <Skeleton className="h-3 w-20 bg-bg-raised-2" />
        <Skeleton className="h-3 w-7 bg-bg-raised-2" />
      </div>
      <div>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center gap-3 border-b border-hairline/60 py-3 last:border-0">
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-4 w-2/5 bg-bg-raised-2" />
              <Skeleton className="h-3 w-1/4 bg-bg-raised-2" />
            </div>
            <Skeleton className="h-5 w-16 flex-none rounded-full bg-bg-raised-2" />
            <Skeleton className="h-7 w-7 flex-none bg-bg-raised-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** First-paint fallback for the dashboard view (metrics + panel, space-y-6). */
export function DashboardContentSkeleton() {
  return (
    <ShimmerShell label="Memuat data workspace" rhythm="space-y-6">
      <DashboardStatsSkeleton />
      <DashboardPanelSkeleton />
    </ShimmerShell>
  );
}

/** First-paint fallback for collection views (two sections, space-y-10). */
export function DashboardCollectionsSkeleton() {
  return (
    <ShimmerShell label="Memuat data modul" rhythm="space-y-10">
      <DashboardTableSkeleton />
      <DashboardTableSkeleton />
    </ShimmerShell>
  );
}
