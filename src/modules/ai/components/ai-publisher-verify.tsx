'use client';

import { useState } from 'react';
import { Flag, ShieldCheck, ThumbsDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { callAi } from '@/modules/ai/components/ai-client';
import { AppTooltip } from '@/ui/app-tooltip';

type PublisherRiskLevel = 'rendah' | 'sedang' | 'tinggi';

export interface PublisherAssessmentView {
  readonly summary: string;
  readonly riskLevel: PublisherRiskLevel;
  readonly checklist: readonly string[];
  readonly recommendation: string;
}

const RISK_BADGE_VARIANT: Readonly<Record<PublisherRiskLevel, 'secondary' | 'outline' | 'destructive'>> = {
  rendah: 'secondary',
  sedang: 'outline',
  tinggi: 'destructive',
};

const RISK_LABEL: Readonly<Record<PublisherRiskLevel, string>> = {
  rendah: 'Dugaan risiko: rendah',
  sedang: 'Dugaan risiko: sedang',
  tinggi: 'Dugaan risiko: tinggi',
};

/**
 * Merangkum bukti pendukung penerbit menjadi penilaian risiko berbahasa dugaan.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param publisherName - Nama resmi penerbit yang dinilai.
 * @param evidence - Referensi bukti pendukung; boleh kosong.
 * @param onAssessment - Menerima penilaian untuk disalin ke catatan verifikasi.
 * @returns Tombol verifikasi AI beserta ringkasan bukti dan cek risiko.
 * @remarks Penilaian bersifat saran; keputusan verifikasi tetap di tangan manusia.
 */
export function AiPublisherVerify({
  organizationId,
  publisherName,
  evidence,
  onAssessment,
}: {
  readonly organizationId?: string | undefined;
  readonly publisherName?: string | undefined;
  readonly evidence?: string | undefined;
  readonly onAssessment?: ((assessment: PublisherAssessmentView) => void) | undefined;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessment, setAssessment] = useState<PublisherAssessmentView | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'sending' | 'sent'>('idle');

  const name = (publisherName ?? '').trim();
  const disabled = busy || organizationId === undefined || organizationId === '' || name === '';

  const sendFeedback = async (feedbackReason: string) => {
    if (feedback === 'sending' || organizationId === undefined || organizationId === '') return;
    setFeedback('sending');
    try {
      await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'ai.insight.report',
          payload: { query: `Publisher verify ${name}`.slice(0, 1000), channel: 'publisher', feedbackReason: feedbackReason.slice(0, 500) },
        }),
      });
      setFeedback('sent');
    } catch {
      setFeedback('idle');
    }
  };

  const run = async () => {
    if (organizationId === undefined || organizationId === '' || name === '') return;
    setBusy(true);
    setError(null);
    try {
      const result = (await callAi(organizationId, 'publisher-verify', { name, evidence: (evidence ?? '').trim() })) as {
        readonly assessment?: PublisherAssessmentView;
      };
      if (result.assessment === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setAssessment(result.assessment);
      onAssessment?.(result.assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy ? 'Memverifikasi…' : 'Verifikasi AI'}</span>
        </Button>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {assessment !== null ? (
        <div className="rounded border border-hairline bg-bg px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={RISK_BADGE_VARIANT[assessment.riskLevel]}>{RISK_LABEL[assessment.riskLevel]}</Badge>
          </div>
          <p className="m-0 mt-1 font-sans text-[11px] leading-relaxed text-paper-dim">{assessment.summary}</p>
          {assessment.checklist.length > 0 ? (
            <ul className="m-0 mt-1 space-y-0.5 pl-4 font-sans text-[11px] leading-relaxed text-paper-dim">
              {assessment.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {assessment.recommendation !== '' ? <p className="m-0 mt-1 font-sans text-[11px] text-paper-dim">Saran: {assessment.recommendation}</p> : null}
          <p className="m-0 mt-1 font-mono text-[10px] text-paper-faint">Penilaian ini bersifat saran; keputusan verifikasi tetap di tangan manusia.</p>
        </div>
      ) : null}
      {assessment !== null ? (
        feedback === 'sent' ? (
          <p className="m-0 font-sans text-[11px] text-paper-faint">Masukan tercatat. Terima kasih.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <AppTooltip label="Laporkan hasil kurang membantu">
              <Button type="button" size="sm" variant="ghost" disabled={busy || feedback === 'sending'} onClick={() => void sendFeedback('thumbs-down')}>
                <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{feedback === 'sending' ? 'Mengirim…' : 'Kurang membantu'}</span>
              </Button>
            </AppTooltip>
            <AppTooltip label="Tandai hasil tidak akurat">
              <Button type="button" size="sm" variant="ghost" disabled={busy || feedback === 'sending'} onClick={() => void sendFeedback('flag-inaccurate')}>
                <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Tandai</span>
              </Button>
            </AppTooltip>
          </div>
        )
      ) : null}
    </div>
  );
}
