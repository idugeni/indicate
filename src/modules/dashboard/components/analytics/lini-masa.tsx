import { formatRelatif, formatTanggalWaktu } from '@/modules/dashboard/components/shared/dashboard-dates';
import type { AktivitasTerbaru } from '@/modules/dashboard/models';
import { cn } from '@/ui/cn';

function nada(status: string): string {
  const keadaan = status.toLowerCase();
  if (keadaan === 'published' || keadaan === 'success' || keadaan === 'active' || keadaan === 'verified') return 'bg-signal';
  if (keadaan === 'failed' || keadaan === 'error' || keadaan === 'rejected' || keadaan === 'suspended') return 'bg-error';
  if (keadaan === 'queued' || keadaan === 'processing' || keadaan === 'retrying' || keadaan === 'pending') return 'bg-warning';
  return 'bg-paper-faint';
}

/**
 * Render lini masa aktivitas operasional terbaru.
 *
 * @param peristiwa - Peristiwa terbaru dari proyeksi analitik (maks 8).
 * @returns Daftar kronologis dengan waktu relatif id-ID.
 */
export function LiniMasa({ peristiwa }: { readonly peristiwa: readonly AktivitasTerbaru[] }) {
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
      {peristiwa.length === 0 ? (
        <p className="m-auto px-2 py-6 text-center font-sans text-[13px] text-paper-dim">Belum ada aktivitas tercatat.</p>
      ) : (
        <ol className="m-0 mt-4 list-none space-y-0 p-0">
          {peristiwa.map((item, indeks) => (
            <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
              {indeks < peristiwa.length - 1 ? (
                <span aria-hidden="true" className="absolute top-5 bottom-0 left-[5px] w-px bg-hairline" />
              ) : null}
              <span aria-hidden="true" className={cn('mt-1.5 h-[11px] w-[11px] flex-none rounded-full border-2 border-bg-raised', nada(item.status))} />
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate font-sans text-[13px] font-medium text-paper" title={item.label}>
                  {item.label}
                </p>
                <p className="m-0 mt-0.5 font-mono text-[11px] tabular-nums text-paper-faint" title={formatTanggalWaktu(item.at)}>
                  <span className="uppercase tracking-wider">{item.status}</span>
                  {' · '}
                  {formatRelatif(item.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
