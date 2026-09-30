'use client';

import { useId, useState, type ChangeEvent } from 'react';
import { ClipboardPaste, Mic } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callAi } from '@/modules/ai/components/ai-client';

const AUDIO_ACCEPT = 'audio/*';
const AUDIO_MIME_ALLOWLIST: ReadonlySet<string> = new Set([
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
]);
const BASE64_LIMIT = 10_000_000;

/**
 * Mentranskripsikan rekaman wawancara menjadi teks redaksi.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param onTranscript - Menerima transkrip saat editor menekan terapkan; tidak menulis ke database.
 * @returns Panel transkripsi audio dengan pratinjau transkrip.
 */
export function AiTranscribePanel({
  organizationId,
  onTranscript,
}: {
  readonly organizationId?: string | undefined;
  readonly onTranscript: (transcript: string) => void;
}) {
  const fileId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const disabled = busy || file === null || organizationId === undefined || organizationId === '';

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null);
    setTranscript(null);
    setError(null);
  };

  const run = async () => {
    if (file === null || organizationId === undefined || organizationId === '') return;
    setBusy(true);
    setError(null);
    try {
      if (!AUDIO_MIME_ALLOWLIST.has(file.type.toLowerCase())) throw new Error('Format audio belum didukung. Gunakan WAV, MP3, WebM, OGG, MP4, atau AAC.');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
        reader.readAsDataURL(file);
      });
      const compact = dataUrl.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '');
      if (compact === '' || compact.length > BASE64_LIMIT) throw new Error('Berkas audio terlalu besar atau kosong.');
      const result = (await callAi(organizationId, 'transcribe-audio', { base64: dataUrl, mimeType: file.type })) as {
        readonly transcript?: string;
      };
      if (typeof result.transcript !== 'string' || result.transcript.trim() === '') throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setTranscript(result.transcript.trim());
    } catch (err) {
      setTranscript(null);
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (transcript !== null) onTranscript(transcript);
  };

  return (
    <div className="space-y-1.5 rounded border border-hairline bg-bg p-2.5">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Transkripsi wawancara AI</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Input id={fileId} type="file" accept={AUDIO_ACCEPT} onChange={pick} disabled={busy} className="h-8 max-w-60 font-sans text-xs" aria-label="Pilih berkas audio untuk ditranskripsikan" />
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy ? 'Mentranskripsikan…' : 'Transkripsikan audio'}</span>
        </Button>
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {transcript !== null ? (
        <div className="space-y-1.5 rounded border border-hairline-strong bg-bg-raised p-2">
          <p className="m-0 line-clamp-4 font-sans text-[11px] text-paper-dim">{transcript}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" size="sm" variant="default" onClick={apply}>
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Terapkan ke isi</span>
            </Button>
          </div>
          <p className="m-0 font-sans text-[11px] text-paper-faint">Periksa transkrip sebelum diterapkan; bagian [tidak jelas] perlu verifikasi manual.</p>
        </div>
      ) : null}
    </div>
  );
}
