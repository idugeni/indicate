'use client';

import { useState } from 'react';
import { FileSearch, Flag, PenLine, ThumbsDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { callAi } from '@/modules/ai/components/ai-client';

interface AnalysisView {
  readonly summary: string;
  readonly suggestedPriority: string;
  readonly riskLevel: string;
  readonly keywords: readonly string[];
  readonly recommendation: string;
}

/**
 * Menganalisis satu laporan dan menyusun draf tanggapan tanpa data pelapor.
 *
 * @param organizationId - Tenant pemilik permintaan.
 * @param category - Kategori laporan.
 * @param details - Uraian laporan; kontak pelapor tidak boleh disertakan.
 * @param onReply - Menerima draf tanggapan untuk disalin ke catatan penanganan.
 * @returns Tombol analisis dan draf per laporan.
 * @remarks Menampilkan risk/priority sebagai dugaan, bukan vonis bersalah.
 */
export function AiModerationAssist({
  organizationId,
  category,
  details,
  onReply,
}: {
  readonly organizationId: string;
  readonly category: string;
  readonly details: string;
  readonly onReply: (draft: string) => void;
}) {
  const [busy, setBusy] = useState<'idle' | 'analysis' | 'reply'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisView | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'sending' | 'sent'>('idle');

  const sendFeedback = async (feedbackReason: string) => {
    if (feedback === 'sending') return;
    setFeedback('sending');
    try {
      await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'ai.insight.report',
          payload: { query: `Moderation ${category}`.slice(0, 1000), channel: 'moderation', feedbackReason: feedbackReason.slice(0, 500) },
        }),
      });
      setFeedback('sent');
    } catch {
      setFeedback('idle');
    }
  };

  const analyze = async () => {
    setBusy('analysis');
    setError(null);
    try {
      const result = (await callAi(organizationId, 'summarize-report', { category, details })) as { readonly analysis?: AnalysisView };
      if (result.analysis === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setAnalysis(result.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy('idle');
    }
  };

  const draft = async () => {
    setBusy('reply');
    setError(null);
    try {
      const context = `Kategori: ${category}\n\nUraian: ${details}`;
      const result = (await callAi(organizationId, 'moderation-reply', { context })) as { readonly draft?: string };
      if (result.draft === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setReply(result.draft);
      onReply(result.draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy('idle');
    }
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={busy !== 'idle'} onClick={() => void analyze()}>
          <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy === 'analysis' ? 'Menganalisis…' : 'Analisis AI'}</span>
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy !== 'idle'} onClick={() => void draft()}>
          <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy === 'reply' ? 'Menyusun…' : 'Draf tanggapan'}</span>
        </Button>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {analysis !== null ? (
        <div className="rounded border border-hairline bg-bg px-2 py-1.5">
          <p className="m-0 font-sans text-[11px] leading-relaxed text-paper-dim">{analysis.summary}</p>
          <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">
            Dugaan prioritas: {analysis.suggestedPriority} · Dugaan risiko: {analysis.riskLevel}
            {analysis.keywords.length > 0 ? ` · ${analysis.keywords.join(', ')}` : ''}
          </p>
          {analysis.recommendation !== '' ? <p className="m-0 mt-1 font-sans text-[11px] text-paper-dim">Saran: {analysis.recommendation}</p> : null}
        </div>
      ) : null}
      {reply !== null ? <p className="m-0 rounded border border-hairline bg-bg px-2 py-1.5 font-sans text-[11px] leading-relaxed text-paper-dim">{reply}</p> : null}
      {analysis !== null || reply !== null ? (
        feedback === 'sent' ? (
          <p className="m-0 font-sans text-[11px] text-paper-faint">Masukan tercatat. Terima kasih.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" size="sm" variant="ghost" disabled={busy !== 'idle' || feedback === 'sending'} onClick={() => void sendFeedback('thumbs-down')} title="Laporkan hasil kurang membantu">
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{feedback === 'sending' ? 'Mengirim…' : 'Kurang membantu'}</span>
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy !== 'idle' || feedback === 'sending'} onClick={() => void sendFeedback('flag-inaccurate')} title="Tandai hasil tidak akurat">
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tandai</span>
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}
