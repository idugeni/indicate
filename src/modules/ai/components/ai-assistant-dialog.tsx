'use client';

import * as React from 'react';
import { Flag, Send, Square, ThumbsDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AppTooltip } from '@/ui/app-tooltip';

interface ChatTurn {
  readonly role: 'user' | 'assistant';
  readonly text: string;
}

type FeedbackState = 'idle' | 'sending' | 'sent';

/**
 * Dialog tanya jawab multi-giliran untuk staf redaksi via kopilot AI dasbor.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan kirim.
 * @param open - Status buka dialog yang dikendalikan pemanggil.
 * @param onOpenChange - Menerima perubahan status buka dari primitif dialog.
 * @returns Dialog asisten AI dengan riwayat, input, stop, dan umpan balik per balasan.
 */
export function AiAssistantDialog({
  organizationId,
  open,
  onOpenChange,
}: {
  readonly organizationId?: string | undefined;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}) {
  const inputId = React.useId();
  const [messages, setMessages] = React.useState<readonly ChatTurn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<Readonly<Record<number, FeedbackState>>>({});
  const controllerRef = React.useRef<AbortController | null>(null);

  const canSend = organizationId !== undefined && organizationId !== '' && !busy;
  const sendDisabled = !canSend || draft.trim() === '';

  const send = async (question: string): Promise<void> => {
    if (organizationId === undefined || organizationId === '' || busy) return;
    const clean = question.trim().slice(0, 2000);
    if (clean === '') return;
    const next: readonly ChatTurn[] = [...messages, { role: 'user', text: clean }];
    setMessages(next);
    setDraft('');
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const response = await fetch('/api/dashboard/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, action: 'assistant-chat', payload: { messages: next } }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as {
        readonly reply?: unknown;
        readonly error?: { readonly message?: unknown };
      } | null;
      if (!response.ok) {
        throw new Error(
          typeof body?.error?.message === 'string' && body.error.message !== '' ? body.error.message : 'Layanan AI sedang sibuk. Silakan coba lagi.',
        );
      }
      const reply = typeof body?.reply === 'string' ? body.reply.trim().slice(0, 3000) : '';
      if (reply === '') throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setMessages([...next, { role: 'assistant', text: reply }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      controllerRef.current = null;
      setBusy(false);
    }
  };

  const stop = (): void => {
    controllerRef.current?.abort();
  };

  const sendFeedback = async (index: number, feedbackReason: string): Promise<void> => {
    if (organizationId === undefined || organizationId === '' || feedback[index] === 'sending' || feedback[index] === 'sent') return;
    const question = [...messages].slice(0, index).reverse().find((turn) => turn.role === 'user')?.text ?? '';
    if (question.trim() === '') return;
    setFeedback((prev) => ({ ...prev, [index]: 'sending' }));
    try {
      await fetch('/api/dashboard/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'ai.insight.report',
          payload: { query: question.slice(0, 1000), channel: 'assistant', feedbackReason: feedbackReason.slice(0, 500) },
        }),
      });
      setFeedback((prev) => ({ ...prev, [index]: 'sent' }));
    } catch {
      setFeedback((prev) => ({ ...prev, [index]: 'idle' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] overflow-y-auto rounded border border-hairline bg-bg-raised p-0 shadow-none sm:max-w-lg">
        <div className="border-b border-hairline bg-bg px-3.5 py-3">
          <DialogTitle>Asisten AI Redaksi</DialogTitle>
          <DialogDescription>Tanya jawab seputar kerja redaksi. Riwayat enam pesan terakhir dikirim sebagai konteks.</DialogDescription>
        </div>

        <div className="space-y-2 p-3.5">
          <div role="log" aria-live="polite" aria-label="Riwayat percakapan" className="max-h-72 space-y-2 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="m-0 font-sans text-xs text-paper-faint">Belum ada percakapan. Tanyakan seputar judul, slug, atau alur redaksi.</p>
            ) : (
              messages.map((turn, index) => (
                <div key={`${index}-${turn.role}`} className="space-y-1">
                  <p className={`m-0 rounded border border-hairline px-2.5 py-2 font-sans text-xs leading-relaxed ${turn.role === 'user' ? 'bg-bg text-paper' : 'bg-bg-raised-2 text-paper-dim'}`}>
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-paper-faint">
                      {turn.role === 'user' ? 'Anda' : 'Asisten'}
                    </span>
                    {turn.text}
                  </p>
                  {turn.role === 'assistant' && feedback[index] !== 'sent' ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AppTooltip label="Laporkan balasan kurang membantu">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={feedback[index] === 'sending' || !canSend}
                          onClick={() => void sendFeedback(index, 'thumbs-down')}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{feedback[index] === 'sending' ? 'Mengirim…' : 'Kurang membantu'}</span>
                        </Button>
                      </AppTooltip>
                      <AppTooltip label="Tandai balasan tidak akurat">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={feedback[index] === 'sending' || !canSend}
                          onClick={() => void sendFeedback(index, 'flag-inaccurate')}
                        >
                          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Tandai</span>
                        </Button>
                      </AppTooltip>
                    </div>
                  ) : null}
                  {turn.role === 'assistant' && feedback[index] === 'sent' ? (
                    <p className="m-0 font-sans text-[11px] text-paper-faint">Masukan tercatat. Terima kasih.</p>
                  ) : null}
                </div>
              ))
            )}
            {busy ? <p className="m-0 font-sans text-[11px] text-paper-faint">Asisten sedang menulis…</p> : null}
          </div>

          {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}

          <form
            className="flex items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <label htmlFor={inputId} className="sr-only">Tanya asisten redaksi</label>
            <Input
              id={inputId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tanya seputar redaksi…"
              maxLength={2000}
              disabled={busy}
              autoComplete="off"
              className="h-9 font-sans text-xs"
            />
            {busy ? (
              <AppTooltip label="Hentikan balasan" side="top">
                <Button type="button" size="sm" variant="outline" onClick={stop}>
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Stop</span>
                </Button>
              </AppTooltip>
            ) : (
              <AppTooltip label="Kirim pertanyaan" side="top">
                <Button type="submit" size="sm" variant="outline" disabled={sendDisabled}>
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Kirim</span>
                </Button>
              </AppTooltip>
            )}
          </form>
          {organizationId === undefined || organizationId === '' ? (
            <p className="m-0 font-sans text-[11px] text-paper-faint">Pilih organisasi untuk mengaktifkan asisten.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
