import { Skeleton } from '@/components/ui/skeleton';

function ShimmerShell({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="space-y-8" aria-busy="true" aria-label={label} role="status">
      {children}
    </div>
  );
}

/** Form fallback mirroring the two-column grid (no CLS on view switches). */
export function DashboardFormSkeleton() {
  return (
    <ShimmerShell label="Memuat formulir">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-hairline bg-bg-raised p-5">
          <Skeleton className="h-4 w-32 bg-bg-raised-2" />
          <Skeleton className="h-10 w-full bg-bg-raised-2" />
          <Skeleton className="h-10 w-full bg-bg-raised-2" />
        </div>
        <div className="space-y-3 rounded-lg border border-hairline bg-bg-raised p-5">
          <Skeleton className="h-4 w-24 bg-bg-raised-2" />
          <Skeleton className="h-10 w-full bg-bg-raised-2" />
          <Skeleton className="h-10 w-full bg-bg-raised-2" />
        </div>
      </div>
    </ShimmerShell>
  );
}

/** Stats fallback mirroring the metrics boxes. */
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="rounded-lg border border-hairline bg-bg-raised p-5">
          <Skeleton className="h-3 w-20 bg-bg-raised-2" />
          <Skeleton className="mt-2 h-7 w-24 bg-bg-raised-2" />
        </div>
      ))}
    </div>
  );
}

/** Table fallback mirroring one ledger section (header + 5 rows). */
export function DashboardTableSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <Skeleton className="h-4 w-40 bg-bg-raised" />
        <Skeleton className="h-3 w-20 bg-bg-raised" />
      </div>
      <div>
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex items-center justify-between gap-3 border-b border-hairline/60 py-3">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-2/5 bg-bg-raised" />
              <Skeleton className="h-2.5 w-1/4 bg-bg-raised" />
            </div>
            <Skeleton className="h-3 w-16 bg-bg-raised" />
            <Skeleton className="h-7 w-7 bg-bg-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** First-paint fallback matching the DataView null-state. */
export function DashboardContentSkeleton() {
  return (
    <ShimmerShell label="Memuat data workspace">
      <DashboardStatsSkeleton />
      <DashboardTableSkeleton />
    </ShimmerShell>
  );
}
