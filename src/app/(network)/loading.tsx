import { Suspense } from 'react';

import { headers } from 'next/headers';

import { Skeleton } from '@/components/ui/skeleton';
import { deliveryComposition } from '@/modules/delivery';

function CleanBlueLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f8fd]" aria-busy="true" aria-label="Memuat berita">
      <div className="border-b border-slate-100 bg-white" aria-hidden="true">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-5 w-32 animate-pulse rounded-full bg-slate-100" />
          <div className="ml-4 hidden h-5 w-20 animate-pulse rounded-full bg-slate-100 sm:block" />
          <div className="hidden h-5 w-20 animate-pulse rounded-full bg-slate-100 md:block" />
          <div className="ml-auto h-9 w-28 animate-pulse rounded-full bg-slate-100" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 md:py-8" aria-hidden="true">
        <div className="h-11 animate-pulse rounded-full bg-white shadow-sm ring-1 ring-slate-200/60" />
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="aspect-[16/10] animate-pulse rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60" />
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white" />
            <div className="h-8 w-full animate-pulse rounded-lg bg-white" />
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-white" />
            <div className="h-4 w-full animate-pulse rounded-full bg-white" />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <div key={n} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60">
              <div className="px-3 pt-3">
                <div className="aspect-[16/10] animate-pulse rounded-xl bg-slate-100" />
              </div>
              <div className="space-y-2 px-5 pb-5">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-1/2 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Tenant public suspense skeleton. Template dipilih dari host request agar
 *  portal terang tidak berkedip shell gelap — gagal apa pun jatuh ke skeleton gelap. */
export default function PublicLoading() {
  return (
    <Suspense fallback={<DarkLoadingSkeleton />}>
      <AdaptiveLoadingSkeleton />
    </Suspense>
  );
}

async function AdaptiveLoadingSkeleton() {
  let useCleanBlue = false;
  try {
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
    const { resolver, content, config } = await deliveryComposition();
    const classification = await resolver.classify(host);
    if (classification.kind === 'site') {
      const site = await content.load(classification.context, {}, { path: '/loading', locale: config.seo.defaultLocale });
      useCleanBlue = site?.settings.colors.templateId === 'clean-blue';
    }
  } catch {
    useCleanBlue = false;
  }
  if (useCleanBlue) {
    return <CleanBlueLoadingSkeleton />;
  }
  return <DarkLoadingSkeleton />;
}

function DarkLoadingSkeleton() {
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
          <Skeleton className="h-40 w-full rounded-lg border border-hairline bg-bg-raised" aria-hidden="true" />
        </aside>
      </main>
    </div>
  );
}
