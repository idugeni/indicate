'use client';

import { useId, useState } from 'react';
import { Flag, Sparkles, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { callAi } from '@/modules/ai/components/ai-client';
import { parseStreamedDraft, useAiStream } from '@/modules/ai/components/use-ai-stream';
import { AppTooltip } from '@/ui/app-tooltip';

export interface EditorialDraft {
  readonly title: string;
  readonly excerpt: string;
  readonly content: string;
  readonly slug: string;
}

/**
 * Menghasilkan draf artikel dan memoles metadata tanpa menyentuh alur simpan.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param currentTitle - Judul saat ini untuk mode poles.
 * @param currentBody - Isi saat ini untuk mode poles.
 * @param onDraft - Menerima draf untuk diisi ke formulir oleh editor.
 * @returns Panel bantuan draf redaksi.
 */
export function AiDraftAssist({
  organizationId,
  currentTitle,
  currentBody,
  onDraft,
}: {
  readonly organizationId?: string | undefined;
  readonly currentTitle?: string;
  readonly currentBody?: string;
  readonly onDraft: (draft: EditorialDraft) => void;
}) {
  const topicId = useId();
  const pointsId = useId();
  const [topic, setTopic] = useState('');
  const [points, setPoints] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [lastTopic, setLastTopic] = useState('');
  const { output: streamOutput, streaming, start: startStream, abort: abortStream } = useAiStream();
  const active = busy || streaming;
  const disabled = active || organizationId === undefined || organizationId === '';

  const sendFeedback = async (feedbackReason: string) => {
    if (organizationId === undefined || organizationId === '' || lastTopic.trim() === '' || feedback === 'sending') return;
    setFeedback('sending');
    try {
      await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'ai.insight.report',
          payload: { query: lastTopic.slice(0, 1000), channel: 'draft', feedbackReason: feedbackReason.slice(0, 500) },
        }),
      });
      setFeedback('sent');
    } catch {
      setFeedback('idle');
    }
  };

  const run = async (draftTopic: string, draftPoints: string) => {
    if (organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    const applyDraft = (draft: EditorialDraft): void => {
      onDraft(draft);
      setLastTopic(draftTopic);
      setFeedback('idle');
    };
    try {
      let raw: string;
      try {
        const streamed = await startStream({ organizationId, topic: draftTopic, points: draftPoints });
        if (streamed === null) return;
        raw = streamed;
      } catch {
        const body = (await callAi(organizationId, 'draft-article', { topic: draftTopic, points: draftPoints })) as {
          readonly draft?: EditorialDraft;
        };
        if (body.draft === undefined) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
        applyDraft(body.draft);
        return;
      }
      const draft = parseStreamedDraft(raw, draftTopic);
      if (draft === null) throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      applyDraft(draft);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.';
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Bantuan draf AI" className="space-y-2 rounded border border-hairline bg-bg p-3">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Bantuan draf AI</p>
      <div className="space-y-1">
        <label htmlFor={topicId} className="font-sans text-xs text-paper-dim">Topik</label>
        <Input id={topicId} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Banjir bandang Wonosobo" maxLength={300} disabled={active} className="h-8 font-sans text-xs" />
      </div>
      <div className="space-y-1">
        <label htmlFor={pointsId} className="font-sans text-xs text-paper-dim">Poin utama</label>
        <Textarea id={pointsId} value={points} onChange={(event) => setPoints(event.target.value)} placeholder="Lokasi, waktu, korban terdampak, respons BPBD…" rows={2} maxLength={2000} disabled={active} className="font-sans text-xs" />
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={disabled || topic.trim().length < 5} onClick={() => void run(topic, points)}>
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{active ? 'Memproses…' : 'Generate draf'}</span>
        </Button>
        <AppTooltip label="Susun ulang judul, slug, dan deskripsi dari isi saat ini">
          <Button
            type="button" size="sm" variant="ghost" disabled={disabled || (currentTitle ?? '').trim() === ''}
            onClick={() => void run(currentTitle ?? '', (currentBody ?? '').slice(0, 2000))}
          >
            <span>{active ? 'Memproses…' : 'Perbaiki judul/slug/deskripsi'}</span>
          </Button>
        </AppTooltip>
        {streaming ? (
          <AppTooltip label="Batalkan streaming draf">
            <Button type="button" size="sm" variant="ghost" onClick={abortStream}>
              <span>Batal</span>
            </Button>
          </AppTooltip>
        ) : null}
      </div>
      {streaming ? (
        <div className="space-y-1">
          <p className="m-0 font-sans text-[11px] text-paper-faint">Menulis draf…</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-paper-dim" aria-live="polite">{streamOutput === '' ? '…' : streamOutput.slice(0, 2000)}</pre>
        </div>
      ) : null}
      <p className="m-0 font-sans text-[11px] text-paper-faint">Hasil mengisi formulir untuk ditinjau editor; tidak menyimpan otomatis.</p>
      {lastTopic.trim() !== '' && feedback !== 'sent' ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-sans text-[11px] text-paper-faint">Hasil kurang pas?</span>
          <AppTooltip label="Laporkan hasil kurang membantu">
            <Button type="button" size="sm" variant="ghost" disabled={feedback === 'sending'} onClick={() => void sendFeedback('thumbs-down')}>
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{feedback === 'sending' ? 'Mengirim…' : 'Kurang membantu'}</span>
            </Button>
          </AppTooltip>
          <AppTooltip label="Tandai hasil tidak akurat">
            <Button type="button" size="sm" variant="ghost" disabled={feedback === 'sending'} onClick={() => void sendFeedback('flag-inaccurate')}>
              <Flag className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tandai</span>
            </Button>
          </AppTooltip>
        </div>
      ) : null}
      {feedback === 'sent' ? <p className="m-0 font-sans text-[11px] text-paper-faint">Masukan tercatat. Terima kasih.</p> : null}
    </section>
  );
}
