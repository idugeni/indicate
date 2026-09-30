'use client';

import { useState } from 'react';
import { Check, ListChecks, Tags, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';

import { AiActionButton, AiPending } from '@/modules/ai/components/ai-action-button';
import { callAi } from '@/modules/ai/components/ai-client';

export interface PolishApplySelection {
  readonly body?: string | undefined;
  readonly categoryIds?: readonly string[] | undefined;
  readonly tags?: readonly string[] | undefined;
}

export interface CategoryOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Menyempurnakan isi dan melengkapi kategori serta topik tanpa menyimpan otomatis.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param currentTitle - Judul sebagai konteks nada tulisan.
 * @param currentBody - Isi mentah yang dipoles dan diklasifikasi.
 * @param categories - Kategori yang boleh dipilih model.
 * @param onApply - Menerima hasil pilihan editor untuk diisi manual ke formulir.
 * @returns Panel penyempurna AI redaksi.
 */
export function AiPolishPanel({
  organizationId,
  currentTitle,
  currentBody,
  categories,
  onApply,
}: {
  readonly organizationId?: string | undefined;
  readonly currentTitle?: string;
  readonly currentBody?: string;
  readonly categories: readonly CategoryOption[];
  readonly onApply: (selection: PolishApplySelection) => void;
}) {
  const [busy, setBusy] = useState<'idle' | 'polish' | 'classify'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [polished, setPolished] = useState('');
  const [classification, setClassification] = useState<{ readonly categories: readonly string[]; readonly tags: readonly string[] } | null>(null);
  const [rounds, setRounds] = useState(0);
  const title = (currentTitle ?? '').trim();
  const body = (currentBody ?? '').trim();
  const ready = busy === 'idle' && organizationId !== undefined && organizationId !== '' && body !== '';

  const runPolish = async () => {
    if (organizationId === undefined || organizationId === '' || body === '') return;
    setBusy('polish');
    setError(null);
    try {
      const result = (await callAi(organizationId, 'polish-body', { title, body })) as {
        readonly body?: string;
      };
      if (typeof result.body !== 'string' || result.body.trim() === '') {
        throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      }
      setPolished(result.body.trim());
      setRounds((count) => count + 1);
      toast.success('Isi selesai dipoles. Tinjau sebelum diterapkan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy('idle');
    }
  };

  const runClassify = async () => {
    if (organizationId === undefined || organizationId === '' || body === '') return;
    setBusy('classify');
    setError(null);
    try {
      const result = (await callAi(organizationId, 'classify-article', {
        title,
        body,
        categories: categories.map((item) => item.name),
      })) as {
        readonly classification?: { readonly categories?: readonly string[]; readonly category?: string | null; readonly tags?: readonly string[] };
      };
      const raw = Array.isArray(result.classification?.categories)
        ? result.classification.categories
        : typeof result.classification?.category === 'string'
          ? [result.classification.category]
          : [];
      const picked = [...new Set(
        raw
          .filter((item): item is string => typeof item === 'string')
          .map((name) => categories.find((item) => item.name.toLowerCase() === name.trim().toLowerCase())?.name)
          .filter((name): name is string => name !== undefined),
      )].slice(0, 3);
      const tags = Array.isArray(result.classification?.tags)
        ? result.classification.tags.filter((item): item is string => typeof item === 'string')
        : [];
      setClassification({ categories: picked, tags });
      if (picked.length < raw.filter((item) => typeof item === 'string' && item.trim() !== '').length) {
        toast.info('Sebagian saran kategori di luar daftar — yang cocok saja bisa diterapkan.');
      } else {
        toast.success('Klasifikasi siap. Tinjau sebelum diterapkan.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy('idle');
    }
  };

  const applyClassification = () => {
    if (classification === null) return;
    const ids = classification.categories
      .map((name) => categories.find((item) => item.name.toLowerCase() === name.toLowerCase())?.id)
      .filter((id): id is string => id !== undefined);
    onApply({
      ...(ids.length === 0 ? {} : { categoryIds: ids }),
      ...(classification.tags.length === 0 ? {} : { tags: classification.tags }),
    });
  };

  return (
    <section aria-label="Penyempurna AI" className="space-y-2 rounded border border-hairline bg-bg p-3">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Penyempurna AI</p>
      <div className="flex flex-wrap gap-1.5">
        <AiActionButton
          busy={busy === 'polish'}
          idleLabel={rounds === 0 ? 'Poles isi' : 'Poles ulang'}
          icon={WandSparkles}
          tone="primary"
          disabled={!ready}
          onClick={() => void runPolish()}
        />
        <AiActionButton
          busy={busy === 'classify'}
          idleLabel="Lengkapi kategori & topik"
          icon={Tags}
          disabled={!ready}
          onClick={() => void runClassify()}
        />
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {busy === 'polish' && polished === '' ? <AiPending label="Memoles alur dan EYD" /> : null}
      {busy === 'classify' && classification === null ? <AiPending label="Mengklasifikasi kategori dan tag" rows={[100, 72]} /> : null}
      {polished !== '' ? (
        <div className="space-y-1.5">
          <p className="m-0 flex items-center gap-1.5 font-sans text-xs font-medium text-paper">
            <WandSparkles className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>Isi poles{rounds > 1 ? ` (ronde ${rounds})` : ''}</span>
          </p>
          <p className="m-0 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-paper-dim">
            {polished.slice(0, 1200)}
          </p>
          <AiActionButton busy={false} idleLabel="Terapkan ke isi" icon={Check} tone="primary" onClick={() => onApply({ body: polished })} />
        </div>
      ) : null}
      {classification !== null ? (
        <div className="space-y-1.5">
          <p className="m-0 flex items-center gap-1.5 font-sans text-xs font-medium text-paper">
            <ListChecks className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
            <span>
              {classification.categories.length === 0 ? 'Tanpa kategori cocok' : classification.categories.join(' · ')}
              {classification.tags.length > 0 ? ` — ${classification.tags.join(', ')}` : ''}
            </span>
          </p>
          <AiActionButton busy={false} idleLabel="Terapkan klasifikasi" icon={Check} tone="primary" onClick={applyClassification} />
        </div>
      ) : null}
      <p className="m-0 font-sans text-[11px] text-paper-faint">Hasil hanya mengisi formulir untuk ditinjau editor; tidak menyimpan otomatis.</p>
    </section>
  );
}
