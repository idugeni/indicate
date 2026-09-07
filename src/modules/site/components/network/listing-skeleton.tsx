import { Section } from '@/modules/site/components/layout/content';
import { Skeleton } from '@/components/ui/skeleton';

/** Fallback streaming generik untuk halaman listing/detail portal: shell statis tetap terkirim, konten tenant menyusul. */
export function ListingSkeleton({ label }: { readonly label: string }) {
  return (
    <Section aria-busy="true" aria-label={label}>
      <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2" aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="rounded-lg border border-hairline bg-bg-raised p-4">
            <Skeleton className="aspect-video w-full bg-bg-raised-2" />
            <Skeleton className="mt-4 h-4 w-3/4 bg-bg-raised-2" />
            <Skeleton className="mt-2 h-3 w-1/2 bg-bg-raised-2" />
          </div>
        ))}
      </div>
    </Section>
  );
}
