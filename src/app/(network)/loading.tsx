import { Skeleton } from '@/components/ui/skeleton';

/** Tenant public suspense skeleton. Pages resolve their Site independently, so no shared layout here — shell stability only. */
export default function PublicLoading() {
  return (
    <div className="network-shell" aria-busy="true" aria-label="Memuat berita">
      <div className="public-header" aria-hidden="true">
        <div className="network-brand">
          <span className="brand-mark">I</span>
          <Skeleton className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
      <main className="public-layout" aria-hidden="true">
        <section className="article-grid">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-hairline bg-bg-raised p-4">
              <Skeleton className="aspect-video w-full bg-bg-raised-2" />
              <Skeleton className="mt-4 h-4 w-3/4 bg-bg-raised-2" />
              <Skeleton className="mt-2 h-3 w-1/2 bg-bg-raised-2" />
            </div>
          ))}
        </section>
        <aside className="public-sidebar">
          <Skeleton className="h-40 w-full rounded-lg border border-hairline bg-bg-raised" />
        </aside>
      </main>
    </div>
  );
}