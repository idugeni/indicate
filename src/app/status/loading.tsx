import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the public status console.
 *
 * @returns Placeholder layout mirroring the header, metric cards, and grids.
 */
export default function StatusLoading() {
  return (
    <div className="min-h-screen bg-bg font-sans text-paper" aria-busy="true" aria-label="Memuat status layanan">
      <div className="w-full border-b border-hairline bg-bg-raised/60">
        <div className="w-full px-4 sm:px-8 lg:px-12 py-3 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-48 bg-paper-faint/20" />
          <Skeleton className="h-4 w-32 bg-paper-faint/20" />
        </div>
      </div>
      <div className="w-full px-4 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="h-6 w-56 bg-paper-faint/20" />
            <Skeleton className="h-10 w-full max-w-2xl bg-paper-faint/20" />
            <Skeleton className="h-5 w-full max-w-xl bg-paper-faint/20" />
          </div>
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['sla', 'latency', 'nodes'].map((key) => (
              <Card key={key} className="border-hairline bg-bg shadow-none rounded-lg">
                <CardHeader className="p-3.5 pb-1">
                  <Skeleton className="h-3 w-20 bg-paper-faint/20" />
                </CardHeader>
                <CardContent className="p-3.5 pt-0">
                  <Skeleton className="h-7 w-24 bg-paper-faint/20" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mt-8">
          {['a', 'b', 'c', 'd'].map((key) => (
            <Card key={key} className="border-hairline bg-bg shadow-none rounded-lg">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-2/3 bg-paper-faint/20" />
                <Skeleton className="h-7 w-full bg-paper-faint/20" />
                <Skeleton className="h-4 w-1/2 bg-paper-faint/20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
