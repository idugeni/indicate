'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { callAi } from '@/modules/ai/components/ai-client';

export interface SeoApplySelection {
  readonly title?: string | undefined;
  readonly metaDescription?: string | undefined;
  readonly slug?: string | undefined;
  readonly excerpt?: string | undefined;
}

interface SeoPreview {
  readonly titles: readonly string[];
  readonly metaDescription: string;
  readonly slug: string;
  readonly excerpt: string;
}

/**
 * Menyarankan judul, deskripsi meta, slug, dan kutipan tanpa menyimpan otomatis.
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
      const result = (await callAi(organizationId, 'seo-suggest', { title, body })) as {
        readonly result?: SeoPreview;
      };
      if (result.result === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setSuggestion(result.result);
      toast.success('Saran SEO siap. Tinjau sebelum diterapkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Bantuan SEO AI" className="space-y-2 rounded border border-hairline bg-bg p-3">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Bantuan SEO AI</p>
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{busy ? 'Memproses…' : 'Saran judul/meta/slug'}</span>
      </Button>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {suggestion !== null ? (
        <div className="space-y-2">
          <ul className="m-0 list-none space-y-1 p-0">
            {suggestion.titles.map((item) => (
              <li key={item} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate font-sans text-xs text-paper">{item}</span>
                <Button type="button" size="sm" variant="ghost" onClick={() => onApply({ title: item })}>
                  <span>Pakai judul</span>
                </Button>
              </li>
            ))}
          </ul>
          {suggestion.metaDescription !== '' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-sans text-[11px] text-paper-dim">{suggestion.metaDescription}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => onApply({ metaDescription: suggestion.metaDescription })}>
                <span>Pakai deskripsi</span>
              </Button>
            </div>
          ) : null}
          {suggestion.slug !== '' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-paper-dim">{suggestion.slug}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => onApply({ slug: suggestion.slug })}>
                <span>Pakai slug</span>
              </Button>
            </div>
          ) : null}
          {suggestion.excerpt !== '' ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-sans text-[11px] text-paper-dim">{suggestion.excerpt}</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => onApply({ excerpt: suggestion.excerpt })}>
                <span>Pakai kutipan</span>
              </Button>
            </div>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApply({ title: suggestion.titles[0], metaDescription: suggestion.metaDescription, slug: suggestion.slug, excerpt: suggestion.excerpt })}
          >
            <span>Terapkan semua</span>
          </Button>
          <p className="m-0 font-sans text-[11px] text-paper-faint">Hasil hanya mengisi formulir untuk ditinjau editor; tidak menyimpan otomatis.</p>
        </div>
      ) : null}
    </section>
  );
}
