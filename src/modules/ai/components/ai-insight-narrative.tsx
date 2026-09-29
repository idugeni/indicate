'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { callAi } from '@/modules/ai/components/ai-client';

/**
 * Menyusun narasi insight dari ringkasan angka dasbor yang diberikan.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param summary - Ringkasan angka dari proyeksi dasbor.
 * @returns Tombol narasi insight analitik.
 * @remarks Tidak mengklaim angka tanpa sumber: narasi hanya merangkum input.
 */
export function AiInsightNarrative({
  organizationId,
  summary,
}: {
  readonly organizationId?: string | undefined;
  readonly summary: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const disabled = busy || organizationId === undefined || organizationId === '' || summary.trim().length < 10;

  const run = async () => {
    if (organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    try {
      const result = (await callAi(organizationId, 'insight-narrative', { summary })) as { readonly narrative?: string };
      if (result.narrative === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setNarrative(result.narrative);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{busy ? 'Menyusun…' : 'Susun narasi insight'}</span>
      </Button>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {narrative !== null ? <p className="m-0 font-sans text-xs leading-relaxed text-paper-dim">{narrative}</p> : null}
    </div>
  );
}
