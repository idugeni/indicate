'use client';

import { useState } from 'react';
import { Check, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { AiActionButton, AiPending } from '@/modules/ai/components/ai-action-button';
import { callAi } from '@/modules/ai/components/ai-client';
import { AppTooltip } from '@/ui/app-tooltip';

export interface SeoApplySelection {
  readonly title?: string | undefined;
  readonly metaDescription?: string | undefined;
  readonly excerpt?: string | undefined;
}

interface SeoPreview {
  readonly titles: readonly string[];
  readonly metaDescription: string;
  readonly excerpt: string;
}

/**
 * Menyarankan judul, deskripsi meta, dan kutipan tanpa menyimpan otomatis.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param currentTitle - Judul artikel saat ini.
 * @param currentBody - Isi artikel saat ini.
 * @param onApply - Menerima pilihan editor untuk diisi manual ke formulir.
 * @returns Panel bantuan SEO redaksi.
 */
export function AiSeoAssist({
  organizationId,
  currentTitle,
  currentBody,
  onApply,
}: {
  readonly organizationId?: string | undefined;
  readonly currentTitle?: string;
  readonly currentBody?: string;
  readonly onApply: (selection: SeoApplySelection) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SeoPreview | null>(null);
  const title = (currentTitle ?? '').trim();
  const body = (currentBody ?? '').trim();
  const disabled = busy || organizationId === undefined || organizationId === '' || (title === '' && body === '');

  const run = async () => {
    if (organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    try {
      const payload = { title, body };
      const settled = await Promise.allSettled([
        callAi(organizationId, 'seo-titles', payload),
        callAi(organizationId, 'seo-meta', payload),
        callAi(organizationId, 'seo-excerpt', payload),
      ]);
      const pick = (index: number): SeoPreview => {
        const entry = settled[index];
        if (entry !== undefined && entry.status === 'fulfilled') return entry.value as SeoPreview;
        return {} as SeoPreview;
      };
      const titlesRaw = pick(0).titles;
      const titles = Array.isArray(titlesRaw)
        ? titlesRaw.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, 3)
        : [];
      if (titles.length === 0) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      const metaDescription = typeof pick(1).metaDescription === 'string' ? pick(1).metaDescription : '';
      const excerpt = typeof pick(2).excerpt === 'string' ? pick(2).excerpt : '';
      setSuggestion({ titles, metaDescription, excerpt });
      toast.success('Saran SEO siap. Tinjau sebelum diterapkan.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const runTitlesOnly = async () => {
    if (organizationId === undefined || organizationId === '' || suggestion === null) return;
    setBusy(true);
    setError(null);
    try {
      const result = (await callAi(organizationId, 'seo-titles', { title, body })) as SeoPreview;
      const titles = Array.isArray(result.titles)
        ? result.titles.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, 3)
        : [];
      if (titles.length === 0) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setSuggestion({ ...suggestion, titles });
      toast.success('Varian judul baru siap.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Bantuan SEO AI" className="space-y-2 rounded border border-hairline bg-bg p-3">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Bantuan SEO AI</p>
      <div className="flex flex-wrap gap-1.5">
        <AiActionButton
          busy={busy}
          idleLabel={suggestion === null ? 'Sempurnakan SEO' : 'Sempurnakan ulang'}
          icon={Search}
          tone="primary"
          disabled={disabled}
          onClick={() => void run()}
        />
        {suggestion !== null && !busy ? (
          <AppTooltip label="Minta varian judul lain">
            <AiActionButton
              busy={false}
              idleLabel="Buat ulang varian"
              icon={RefreshCw}
              disabled={disabled}
              onClick={() => void runTitlesOnly()}
            />
          </AppTooltip>
        ) : null}
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {busy ? <AiPending label="Menyusun judul dan deskripsi" /> : null}
      {suggestion !== null ? (
        <div className="space-y-2">
          <ul className="m-0 list-none space-y-1 p-0">
            {suggestion.titles.map((item) => (
              <li key={item} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-sans text-xs text-paper">{item}</span>
                <AiActionButton busy={false} idleLabel="Pakai judul" size="xs" onClick={() => onApply({ title: item })} />
              </li>
            ))}
          </ul>
          {suggestion.metaDescription !== '' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-sans text-[11px] text-paper-dim">{suggestion.metaDescription}</span>
              <AiActionButton busy={false} idleLabel="Pakai deskripsi" size="xs" onClick={() => onApply({ metaDescription: suggestion.metaDescription })} />
            </div>
          ) : null}
          {suggestion.excerpt !== '' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-sans text-[11px] text-paper-dim">{suggestion.excerpt}</span>
              <AiActionButton busy={false} idleLabel="Pakai kutipan" size="xs" onClick={() => onApply({ excerpt: suggestion.excerpt })} />
            </div>
          ) : null}
          <AiActionButton
            busy={false}
            idleLabel="Terapkan semua"
            icon={Check}
            tone="primary"
            onClick={() => onApply({ title: suggestion.titles[0], metaDescription: suggestion.metaDescription, excerpt: suggestion.excerpt })}
          />
          <p className="m-0 font-sans text-[11px] text-paper-faint">Hasil hanya mengisi formulir untuk ditinjau editor; tidak menyimpan otomatis.</p>
        </div>
      ) : null}
    </section>
  );
}
