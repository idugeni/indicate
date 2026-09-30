'use client';

import { useState } from 'react';
import { Download, Volume2 } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { callAi } from '@/modules/ai/components/ai-client';

const VOICE_OPTIONS: readonly string[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Aoede'];

const TEXT_MAX = 4000;

function extensionFor(mimeType: string): string {
  const subtype = mimeType.toLowerCase().split(';')[0]?.split('/')[1] ?? '';
  if (subtype === 'mpeg' || subtype === 'mp3') return 'mp3';
  if (subtype === 'ogg') return 'ogg';
  if (subtype === 'mp4' || subtype === 'x-m4a') return 'm4a';
  if (subtype === 'webm') return 'webm';
  return 'wav';
}

/**
 * Membacakan teks artikel menjadi audio pratinjau yang bisa diunduh.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param sourceText - Isi awal dari editor; suntingan lokal tidak menulis balik.
 * @param onAudio - Menerima audio untuk disimpan manual oleh pemanggil.
 * @returns Panel teks-ke-suara dengan pratinjau human-in-loop.
 */
export function AiTtsPanel({
  organizationId,
  sourceText,
  onAudio,
}: {
  readonly organizationId?: string | undefined;
  readonly sourceText?: string | undefined;
  readonly onAudio?: ((audio: { readonly mimeType: string; readonly base64: string }) => void) | undefined;
}) {
  const [text, setText] = useState(sourceText ?? '');
  const [voice, setVoice] = useState<string>('Kore');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<{ readonly mimeType: string; readonly base64: string } | null>(null);
  const disabled = busy || organizationId === undefined || organizationId === '' || text.trim() === '';
  const dataUrl = audio === null ? null : `data:${audio.mimeType};base64,${audio.base64}`;

  const run = async () => {
    if (organizationId === undefined || organizationId === '' || text.trim() === '') return;
    setBusy(true);
    setError(null);
    try {
      const result = (await callAi(organizationId, 'tts-speak', { text: text.slice(0, TEXT_MAX), voice })) as {
        readonly audio?: { readonly mimeType: string; readonly base64: string };
      };
      if (
        result.audio === undefined ||
        typeof result.audio.mimeType !== 'string' ||
        !result.audio.mimeType.toLowerCase().startsWith('audio/') ||
        typeof result.audio.base64 !== 'string' ||
        result.audio.base64 === ''
      ) {
        throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      }
      setAudio({ mimeType: result.audio.mimeType, base64: result.audio.base64 });
      onAudio?.({ mimeType: result.audio.mimeType, base64: result.audio.base64 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Teks-ke-suara AI" className="space-y-2 rounded border border-hairline bg-bg p-3">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Teks-ke-suara AI</p>
      <div className="space-y-1">
        <Label htmlFor="ai-tts-text" className="font-sans text-xs text-paper-dim">Teks untuk dibacakan</Label>
        <Textarea
          id="ai-tts-text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Tempel atau tulis teks artikel di sini…"
          rows={4}
          maxLength={TEXT_MAX}
          disabled={busy}
          className="font-sans text-xs"
        />
        <p className="m-0 text-right font-mono text-[11px] tabular-nums text-paper-faint" aria-live="polite">{text.length}/{TEXT_MAX}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ai-tts-voice" className="font-sans text-xs text-paper-dim">Suara</Label>
        <select
          id="ai-tts-voice"
          value={voice}
          onChange={(event) => setVoice(event.target.value)}
          disabled={busy}
          className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-sans text-xs text-paper"
        >
          {VOICE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
          <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy ? 'Membacakan…' : 'Buatkan suara'}</span>
        </Button>
        {dataUrl !== null && audio !== null ? (
          <a href={dataUrl} download={`artikel-suara.${extensionFor(audio.mimeType)}`} className={buttonVariants({ size: 'sm', variant: 'ghost' })}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Unduh audio</span>
          </a>
        ) : null}
      </div>
      {dataUrl !== null ? (
        <audio controls src={dataUrl} className="w-full" aria-label="Pratinjau audio hasil teks-ke-suara" />
      ) : null}
      <p className="m-0 font-sans text-[11px] text-paper-faint">Pratinjau untuk ditinjau editor; unduh untuk menyimpan manual, tidak menyimpan otomatis.</p>
    </section>
  );
}
