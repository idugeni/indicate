'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { ClipboardCopy, ImagePlus, Newspaper } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callAi } from '@/modules/ai/components/ai-client';

export interface VisionDraftResult {
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly alt: string;
  readonly caption: string;
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_MIME_ALLOWLIST: ReadonlySet<string> = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BASE64_LIMIT = 7_000_000;

/**
 * Menganalisis gambar menjadi draf artikel beserta alt dan caption.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param onDraft - Menerima draf visual saat editor menekan tempel; tidak menulis ke database.
 * @returns Panel analisis gambar dengan pratinjau draf.
 */
export function AiMediaAnalyze({
  organizationId,
  onDraft,
}: {
  readonly organizationId?: string | undefined;
  readonly onDraft: (draft: VisionDraftResult) => void;
}) {
  const fileId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<VisionDraftResult | null>(null);
  const [copied, setCopied] = useState(false);
  const disabled = busy || file === null || organizationId === undefined || organizationId === '';

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setDraft(null);
    setCopied(false);
    setError(null);
  };

  const run = async () => {
    if (file === null || organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      if (!IMAGE_MIME_ALLOWLIST.has(file.type.toLowerCase())) throw new Error('Format gambar belum didukung. Gunakan JPEG, PNG, atau WebP.');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
        reader.readAsDataURL(file);
      });
      const compact = dataUrl.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
      if (compact === '' || compact.length > BASE64_LIMIT) throw new Error('Berkas gambar terlalu besar atau kosong.');
      const result = (await callAi(organizationId, 'vision-draft', { base64: dataUrl, mimeType: file.type, hint: '' })) as {
        readonly draft?: VisionDraftResult;
      };
      if (result.draft === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setDraft(result.draft);
    } catch (err) {
      setDraft(null);
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const copyDraft = async () => {
    if (draft === null) return;
    const text = [
      `Judul: ${draft.title}`,
      `Slug: ${draft.slug}`,
      `Excerpt: ${draft.excerpt}`,
      '',
      draft.content,
      '',
      `Tag: ${draft.tags.join(', ')}`,
      `Alt: ${draft.alt}`,
      `Caption: ${draft.caption}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('Gagal menyalin draf ke clipboard.');
    }
  };

  const useDraft = () => {
    if (draft !== null) onDraft(draft);
  };

  return (
    <div className="space-y-1.5 rounded border border-hairline bg-bg p-2.5">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Analisis gambar AI</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Input id={fileId} type="file" accept={IMAGE_ACCEPT} onChange={pick} disabled={busy} className="h-8 max-w-60 font-sans text-xs" aria-label="Pilih gambar untuk dianalisis" />
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy ? 'Menganalisis…' : 'Analisis gambar'}</span>
        </Button>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {draft !== null ? (
        <div className="space-y-1.5 rounded border border-hairline-strong bg-bg-raised p-2">
          <p className="m-0 font-sans text-xs font-semibold text-paper">{draft.title}</p>
          <p className="m-0 font-mono text-[11px] text-paper-faint">/{draft.slug}</p>
          {draft.excerpt !== '' ? <p className="m-0 font-sans text-[11px] text-paper-dim">{draft.excerpt}</p> : null}
          <p className="m-0 line-clamp-4 font-sans text-[11px] text-paper-dim">{draft.content}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" size="sm" variant="outline" onClick={() => void copyDraft()}>
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{copied ? 'Tersalin' : 'Salin draf'}</span>
            </Button>
            <Button type="button" size="sm" variant="default" onClick={useDraft}>
              <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tempel ke form media</span>
            </Button>
          </div>
          <p className="m-0 font-sans text-[11px] text-paper-faint">{draft.alt === '' ? `Caption: ${draft.caption}` : `Alt: ${draft.alt} · Caption: ${draft.caption}`}</p>
        </div>
      ) : null}
    </div>
  );
}
