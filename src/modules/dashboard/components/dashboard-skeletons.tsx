import { Skeleton } from '@/components/ui/skeleton';
import type { View } from '@/modules/dashboard/components/dashboard-types';

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

/** Stats fallback mirroring metric boxes (icon + label, mono value). */
export function DashboardStatsSkeleton({ count = 8 }: { readonly count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (slot, index) => {
        void slot;
        return (
        <div key={index} className="rounded-lg border border-hairline bg-bg-raised p-5">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 bg-bg-raised-2" />
            <Skeleton className="h-3 w-20 bg-bg-raised-2" />
          </div>
          <Skeleton className="mt-1.5 h-6 w-24 bg-bg-raised-2" />
        </div>
      );
      })}
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
export function DashboardContentSkeleton({ label = 'Memuat data workspace' }: { readonly label?: string }) {
  return (
    <ShimmerShell label={label} rhythm="space-y-6">
      <DashboardStatsSkeleton />
      <DashboardPanelSkeleton />
    </ShimmerShell>
  );
}

/** First-paint fallback for collection views (two sections, space-y-6). */
export function DashboardCollectionsSkeleton() {
  return (
    <ShimmerShell label="Memuat data modul" rhythm="space-y-6">
      <DashboardTableSkeleton />
      <DashboardTableSkeleton />
    </ShimmerShell>
  );
}

/** Tab-bar fallback mirroring TabsList (four chips). */
export function DashboardTabsSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="inline-flex h-8 w-fit max-w-full items-center gap-1 overflow-hidden rounded-lg border border-hairline bg-bg-raised p-[3px]"
    >
      <Skeleton className="h-[26px] w-32 bg-bg-raised-2" />
      <Skeleton className="h-[26px] w-28 bg-bg-raised-2" />
      <Skeleton className="h-[26px] w-20 bg-bg-raised-2" />
      <Skeleton className="h-[26px] w-20 bg-bg-raised-2" />
    </div>
  );
}

function DashboardFormCardSkeleton() {
  return (
    <div className="rounded-lg border border-hairline bg-bg-raised" aria-hidden="true">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 pb-2.5 pt-3 sm:px-5 sm:pb-3 sm:pt-3.5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 bg-bg-raised-2" />
          <Skeleton className="h-4 w-28 bg-bg-raised-2" />
        </div>
        <Skeleton className="h-3 w-24 bg-bg-raised-2" />
      </div>
      <div className="space-y-3.5 px-4 py-4 sm:px-5">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-1.5">
            <Skeleton className="h-3 w-24 bg-bg-raised-2" />
            <Skeleton className="h-9 w-full bg-bg-raised-2" />
          </div>
        ))}
        <Skeleton className="h-9 w-full bg-bg-raised-2" />
      </div>
    </div>
  );
}

function FormsGridBare({ columns, count }: { readonly columns: 1 | 2 | 3; readonly count: number }) {
  return (
    <div
      aria-hidden="true"
      className={`grid items-start gap-6 ${columns === 3 ? 'md:grid-cols-3' : columns === 2 ? 'md:grid-cols-2' : ''}`}
    >
      {Array.from({ length: count }, (slot, index) => {
        void slot;
        return (
        <DashboardFormCardSkeleton key={index} />
      );
      })}
    </div>
  );
}

/** Form-grid fallback mirroring multi-card panels (configuration 3, publisher 2). */
export function DashboardFormsGridSkeleton({
  columns,
  count,
}: {
  readonly columns: 1 | 2 | 3;
  readonly count?: number;
}) {
  return (
    <ShimmerShell
      label="Memuat formulir"
      rhythm="space-y-0"
    >
      <FormsGridBare columns={columns} count={count ?? columns} />
    </ShimmerShell>
  );
}

function TablesGridBare({ columns, count }: { readonly columns: 1 | 2 | 3; readonly count: number }) {
  return (
    <div
      aria-hidden="true"
      className={`grid items-start gap-6 ${columns === 3 ? 'lg:grid-cols-3' : columns === 2 ? 'lg:grid-cols-2' : ''}`}
    >
      {Array.from({ length: count }, (slot, index) => {
        void slot;
        return (
        <DashboardTableSkeleton key={index} />
      );
      })}
    </div>
  );
}

/** Table-grid skeleton for multi-section operational workspaces (gap-6, 2–3 columns on lg). */
export function DashboardTablesGridSkeleton({
  columns,
  count,
}: {
  readonly columns: 1 | 2 | 3;
  readonly count?: number;
}) {
  return (
    <ShimmerShell label="Memuat data modul" rhythm="space-y-0">
      <TablesGridBare columns={columns} count={count ?? columns} />
    </ShimmerShell>
  );
}

/** Tile-grid fallback mirroring the media library grid (aspect-square tiles). */
export function DashboardTilesSkeleton({ count = 8 }: { readonly count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
    >
      {Array.from({ length: count }, (slot, index) => {
        void slot;
        return (
        <div key={index} className="overflow-hidden rounded-md border border-hairline bg-bg">
          <Skeleton className="aspect-square w-full rounded-none bg-bg-raised-2" />
          <div className="space-y-1 p-2">
            <Skeleton className="h-3 w-3/4 bg-bg-raised-2" />
            <Skeleton className="h-2.5 w-1/2 bg-bg-raised-2" />
            <Skeleton className="h-2.5 w-2/3 bg-bg-raised-2" />
          </div>
        </div>
      );
      })}
    </div>
  );
}

/** Mini-card fallback mirroring taxonomy/moderation list grids. */
export function DashboardMiniCardsSkeleton({ count = 8 }: { readonly count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      {Array.from({ length: count }, (slot, index) => {
        void slot;
        return (
        <div key={index} className="rounded-md border border-hairline bg-bg p-3">
          <div className="flex items-start justify-between gap-1.5">
            <Skeleton className="h-3.5 w-2/3 bg-bg-raised-2" />
            <Skeleton className="h-4 w-12 rounded-full bg-bg-raised-2" />
          </div>
          <Skeleton className="mt-1.5 h-3 w-1/3 bg-bg-raised-2" />
          <div className="mt-3 flex items-center justify-between border-t border-hairline/60 pt-2">
            <Skeleton className="h-3 w-16 bg-bg-raised-2" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-6 w-6 bg-bg-raised-2" />
              <Skeleton className="h-6 w-6 bg-bg-raised-2" />
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}

/** Split-form fallback mirroring main-form-plus-aside panels (editorial, cache purge). */
export function DashboardSplitFormSkeleton() {
  return (
    <ShimmerShell label="Memuat formulir" rhythm="space-y-0">
      <div aria-hidden="true" className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DashboardFormCardSkeleton />
        <div className="space-y-3 rounded-lg border border-hairline bg-bg-raised p-4">
          <Skeleton className="h-4 w-2/3 bg-bg-raised-2" />
          <Skeleton className="h-3 w-full bg-bg-raised-2" />
          <Skeleton className="h-3 w-5/6 bg-bg-raised-2" />
          <Skeleton className="h-9 w-full bg-bg-raised-2" />
        </div>
      </div>
    </ShimmerShell>
  );
}

/** Media fallback mirroring the library (summary, folders, filter, tile grid). */
export function DashboardMediaSkeleton() {
  return (
    <ShimmerShell label="Memuat pustaka media" rhythm="flex flex-col gap-3">
      <DashboardPanelSkeleton />
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[52px] w-36 rounded-md bg-bg-raised" />
        ))}
      </div>
      <div aria-hidden="true" className="rounded-lg border border-hairline bg-bg-raised p-3.5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
          <Skeleton className="h-9 w-full bg-bg-raised-2" />
          <Skeleton className="h-9 w-full bg-bg-raised-2" />
          <Skeleton className="h-9 w-full bg-bg-raised-2" />
          <Skeleton className="h-9 w-20 bg-bg-raised-2" />
        </div>
      </div>
      <DashboardTilesSkeleton />
    </ShimmerShell>
  );
}

const VIEW_LOADING_LABELS: Readonly<Record<View, string>> = {
  dashboard: 'Memuat Command Center',
  configuration: 'Memuat konfigurasi infrastruktur',
  publishers: 'Memuat jaringan publisher',
  editorial: 'Memuat ruang redaksi',
  taxonomy: 'Memuat kategori dan tag',
  articles: 'Memuat pustaka artikel',
  media: 'Memuat pustaka media',
  publishing: 'Memuat antrean publikasi',
  published: 'Memuat hasil publikasi',
  ads: 'Memuat kampanye dan penempatan iklan',
  analytics: 'Memuat analitik jaringan',
  audit: 'Memuat audit dan keamanan',
  operations: 'Memuat operasi sistem',
  settings: 'Memuat pengaturan workspace',
  customers: 'Memuat operasi pelanggan',
  content: 'Memuat konten web publik',
  billing: 'Memuat billing dan monetisasi',
  moderation: 'Memuat trust dan moderasi',
  ai: 'Memuat kontrol AI',
};

/** First-paint fallback shaped like the active view instead of one generic stack. */
export function DashboardViewSkeleton({ view }: { readonly view: View }) {
  if (view === 'dashboard') return <DashboardContentSkeleton label={VIEW_LOADING_LABELS.dashboard} />;
  return (
    <ShimmerShell label={VIEW_LOADING_LABELS[view]} rhythm="space-y-6">
      {view === 'configuration' ? (
        <>
          <DashboardTabsSkeleton />
          <FormsGridBare columns={3} count={3} />
          <TablesGridBare columns={3} count={3} />
        </>
      ) : null}
      {view === 'settings' ? (
        <>
          <DashboardStatsSkeleton count={4} />
          <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
            <DashboardPanelSkeleton />
            <FormsGridBare columns={2} count={2} />
          </div>
        </>
      ) : null}
      {view === 'publishers' ? (
        <>
          <FormsGridBare columns={2} count={2} />
          <TablesGridBare columns={2} count={2} />
        </>
      ) : null}
      {view === 'content' ? (
        <>
          <DashboardStatsSkeleton count={4} />
          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <DashboardPanelSkeleton />
            <TablesGridBare columns={2} count={2} />
          </div>
        </>
      ) : null}
      {view === 'billing' ? (
        <>
          <DashboardTabsSkeleton />
          <DashboardStatsSkeleton count={4} />
          <FormsGridBare columns={1} count={1} />
        </>
      ) : null}
      {view === 'media' ? (
        <>
          <DashboardPanelSkeleton />
          <DashboardTilesSkeleton />
        </>
      ) : null}
      {view === 'ads' ? (
        <>
          <DashboardStatsSkeleton count={4} />
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <TablesGridBare columns={1} count={1} />
            <div className="space-y-4">
              <DashboardFormCardSkeleton />
              <DashboardPanelSkeleton />
            </div>
          </div>
          <TablesGridBare columns={2} count={2} />
        </>
      ) : null}
      {view === 'taxonomy' ? (
        <>
          <FormsGridBare columns={2} count={2} />
          <DashboardMiniCardsSkeleton />
        </>
      ) : null}
      {view === 'articles' ? (
        <>
          <DashboardStatsSkeleton count={4} />
          <TablesGridBare columns={1} count={1} />
        </>
      ) : null}
      {view === 'editorial' ? (
        <div aria-hidden="true" className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <DashboardFormCardSkeleton />
          <div className="space-y-3 rounded-lg border border-hairline bg-bg-raised p-4">
            <Skeleton className="h-4 w-2/3 bg-bg-raised-2" />
            <Skeleton className="h-3 w-full bg-bg-raised-2" />
            <Skeleton className="h-9 w-full bg-bg-raised-2" />
          </div>
        </div>
      ) : null}
      {view === 'publishing' ? <FormsGridBare columns={1} count={2} /> : null}
      {view === 'published' ? <TablesGridBare columns={1} count={3} /> : null}
      {view === 'analytics' ? <TablesGridBare columns={2} count={4} /> : null}
      {view === 'audit' ? (
        <>
          <DashboardStatsSkeleton count={5} />
          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <DashboardPanelSkeleton />
            <TablesGridBare columns={2} count={2} />
          </div>
        </>
      ) : null}
            {view === 'operations' ? (
        <>
          <DashboardStatsSkeleton count={6} />
          <DashboardTabsSkeleton />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <TablesGridBare columns={1} count={3} />
            <div className="space-y-4"><DashboardPanelSkeleton /><DashboardPanelSkeleton /></div>
          </div>
        </>
      ) : null}
      {view === 'customers' ? (
        <>
          <DashboardStatsSkeleton count={4} />
          <FormsGridBare columns={1} count={2} />
          <TablesGridBare columns={1} count={1} />
        </>
      ) : null}
      {view === 'moderation' ? (
        <>
          <DashboardStatsSkeleton count={3} />
          <DashboardTabsSkeleton />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <TablesGridBare columns={1} count={3} />
            <DashboardFormCardSkeleton />
          </div>
        </>
      ) : null}
      {view === 'ai' ? (
        <>
          <DashboardStatsSkeleton count={5} />
          <FormsGridBare columns={2} count={2} />
        </>
      ) : null}
    </ShimmerShell>
  );
}
