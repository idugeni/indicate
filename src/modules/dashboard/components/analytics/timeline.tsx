import { EmptyState } from '@/modules/dashboard/components/empty-state';
import { formatRelative, formatDateTime } from '@/modules/dashboard/components/shared/dashboard-dates';
import type { AktivitasTerbaru } from '@/modules/dashboard/models';
import { cn } from '@/ui/cn';

function tone(status: string): string {
  const state = status.toLowerCase();
  if (state === 'published' || state === 'success' || state === 'active' || state === 'verified') return 'bg-signal';
  if (state === 'failed' || state === 'error' || state === 'rejected' || state === 'suspended') return 'bg-error';
  if (state === 'queued' || state === 'processing' || state === 'retrying' || state === 'pending') return 'bg-warning';
  return 'bg-paper-faint';
}

/**
 * Render the latest operational activity timeline.
 *
 * @param events - Latest events from the analytics projection (max 8).
 * @returns Chronological list with Indonesian relative times.
 */
export function Timeline({ events }: { readonly events: readonly AktivitasTerbaru[] }) {
  return (
    <section
      aria-label="Lini masa"
      className="flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6"
    >
      <h2 className="m-0 font-sans text-sm font-semibold tracking-tight text-paper">
        Lini masa
      </h2>
      <p className="m-0 mt-0.5 font-sans text-xs text-paper-faint">
        Aktivitas operasional terbaru
      </p>
      {events.length === 0 ? (
        <EmptyState title="Belum ada aktivitas tercatat." description="Data akan tampil di sini setelah tersedia." />
      ) : (
        <ol className="m-0 mt-4 list-none space-y-0 p-0">
          {events.map((item, index) => (
            <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              {index < events.length - 1 ? (
                <span aria-hidden="true" className="absolute top-5 bottom-0 left-[5px] w-px bg-hairline" />
              ) : null}
              <span aria-hidden="true" className={cn('mt-1.5 h-[11px] w-[11px] flex-none rounded-full border-2 border-bg-raised', tone(item.status))} />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-sans text-[13px] font-medium text-paper" title={item.label}>
                  {item.label}
                </p>
                <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint" title={formatDateTime(item.at)}>
                  <span className="uppercase tracking-wider">{item.status}</span>
                  {' · '}
                  {formatRelative(item.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
