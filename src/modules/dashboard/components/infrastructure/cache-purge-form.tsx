'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { RefreshCw } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { FormNotice } from '@/modules/dashboard/components/shared/form-notice';

interface SiteOption {
  readonly id: string;
  readonly normalizedHostname: string;
}

export function CachePurgeForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as { readonly sites?: readonly SiteOption[] } | null;
  const siteSelectId = useId();
  const [siteId, setSiteId] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [isPurging, startPurgeTransition] = useTransition();

  const sites = model?.sites ?? [];
  const targetLabel = siteId === '' ? 'semua situs dalam scope' : (sites.find((site) => site.id === siteId)?.normalizedHostname ?? siteId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    startPurgeTransition(async () => {
      const result = await command('site.cache.purge', siteId === '' ? {} : { siteId });
      if (result === null) {
        setNotice({ tone: 'error', message: 'Purge gagal. Periksa pesan kesalahan di atas halaman.' });
        return;
      }
      const value = result as { readonly sites?: readonly { readonly hostname: string }[]; readonly dispatched?: { readonly completed: number; readonly failed: number } | null };
      const count = value.sites?.length ?? 0;
      const dispatchNote = value.dispatched === null || value.dispatched === undefined
        ? 'dieksekusi reconciler berikutnya'
        : `${value.dispatched.completed} tugas selesai, ${value.dispatched.failed} gagal`;
      setNotice({ tone: 'success', message: `Purge diminta untuk ${targetLabel} (${count} situs) — ${dispatchNote}.` });
    });
  };

  return (
    <SectionCard icon={RefreshCw} title="Purge cache" eyebrow="Edge & CDN">
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {notice ? <FormNotice tone={notice.tone}>{notice.message}</FormNotice> : null}
        <div className="space-y-1.5">
          <label htmlFor={siteSelectId} className="font-mono text-xs text-paper-dim">
            Target purge
          </label>
          <select
            id={siteSelectId}
            value={siteId}
            disabled={isPurging}
            onChange={(event) => setSiteId(event.target.value)}
            className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
          >
            <option value="">Semua situs</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.normalizedHostname}
              </option>
            ))}
          </select>
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-faint">
            Mengirim invalidasi Next + Cloudflare untuk {targetLabel}. Tercatat di audit dan terlihat di Operasional.
          </p>
        </div>
        <div>
          <button
            type="submit"
            disabled={isPurging}
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
          >
            {isPurging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            <span>{isPurging ? 'Mengirim purge…' : 'Purge sekarang'}</span>
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
