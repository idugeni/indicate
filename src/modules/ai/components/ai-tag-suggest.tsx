'use client';

import { useState } from 'react';
import { Hash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { callAi } from '@/modules/ai/components/ai-client';

/**
 * Menyarankan tag dan kategori dari judul dan isi.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param title - Judul artikel.
 * @param body - Isi artikel.
 * @param onApply - Menerima saran untuk diterapkan manual oleh editor.
 * @returns Tombol saran taksonomi.
 */
export function AiTagSuggest({
  organizationId,
  title,
  body,
  onApply,
}: {
  readonly organizationId?: string | undefined;
  readonly title: string;
  readonly body: string;
  readonly onApply: (suggestion: { readonly tags: readonly string[]; readonly category: string | null }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<readonly string[]>([]);
  const disabled = busy || organizationId === undefined || organizationId === '' || (title.trim() === '' && body.trim() === '');

  const run = async () => {
    if (organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    try {
      const result = (await callAi(organizationId, 'suggest-tags', { title, body })) as {
        readonly suggestion?: { readonly tags: readonly string[]; readonly category: string | null };
      };
      if (result.suggestion === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setPreview(result.suggestion.tags);
      onApply(result.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
        <Hash className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{busy ? 'Memproses…' : 'Saran tag/kategori'}</span>
      </Button>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {preview.length > 0 ? <p className="m-0 font-mono text-[11px] text-paper-dim">Saran: {preview.join(', ')}</p> : null}
    </div>
  );
}
