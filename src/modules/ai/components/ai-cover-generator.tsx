'use client';

import { useId, useState } from 'react';
import { Check, ImagePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { callAi } from '@/modules/ai/components/ai-client';

const STYLE_PRESETS: readonly string[] = ['Foto jurnalistik', 'Ilustrasi datar', 'Sinematik'];

const ASPECT_PRESETS: readonly ('16:9' | '1:1' | '9:16')[] = ['16:9', '1:1', '9:16'];

export interface CoverImagePayload {
  readonly mimeType: string;
  readonly base64: string;
}

/**
 * Membuat gambar sampul editorial dari judul via model gambar.
 *
 * @param organizationId - Tenant pemilik permintaan; kosong menonaktifkan tombol.
 * @param defaultPrompt - Judul awal untuk kolom input.
 * @param onImage - Menerima berkas gambar terpilih untuk disimpan induk lewat alur media; komponen ini tidak menulis ke pustaka media.
 * @returns Panel generator sampul dengan pratinjau human-in-loop.
 */
export function AiCoverGenerator({
  organizationId,
  defaultPrompt,
  onImage,
}: {
  readonly organizationId?: string | undefined;
  readonly defaultPrompt?: string | undefined;
  readonly onImage: (image: CoverImagePayload) => void;
}) {
  const titleId = useId();
  const [title, setTitle] = useState(defaultPrompt ?? '');
  const [style, setStyle] = useState<string>(STYLE_PRESETS[0] ?? 'Foto jurnalistik');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '1:1' | '9:16'>('16:9');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CoverImagePayload | null>(null);
  const disabled = busy || organizationId === undefined || organizationId === '' || title.trim() === '';

  const run = async () => {
    if (organizationId === undefined || organizationId === '' || title.trim() === '') return;
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const result = (await callAi(organizationId, 'cover-image', { title: title.trim(), style, aspectRatio })) as {
        readonly image?: { readonly mimeType?: unknown; readonly base64?: unknown };
      };
      const mimeType = typeof result.image?.mimeType === 'string' ? result.image.mimeType : '';
      const base64 = typeof result.image?.base64 === 'string' ? result.image.base64 : '';
      if (!mimeType.toLowerCase().startsWith('image/') || base64 === '') throw new Error('Layanan AI sedang sibuk. Silakan coba lagi.');
      setPreview({ mimeType, base64 });
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : 'Layanan AI sedang sibuk. Silakan coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const useImage = () => {
    if (preview !== null) onImage(preview);
  };

  return (
    <div className="space-y-1.5 rounded border border-hairline bg-bg p-2.5">
      <p className="m-0 font-mono text-[10px] uppercase tracking-wider text-paper-faint">Gambar sampul AI</p>
      <div className="space-y-1.5">
        <Label htmlFor={titleId} className="font-sans text-[11px] font-medium text-paper-dim">Judul sumber visual</Label>
        <Input
          id={titleId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          placeholder="cth: Banjir surut di Wonosobo"
          className="h-8 font-sans text-xs"
          aria-label="Judul sumber visual sampul"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Gaya gambar">
        {STYLE_PRESETS.map((preset) => (
          <Button key={preset} type="button" size="sm" variant={style === preset ? 'default' : 'outline'} disabled={busy} aria-pressed={style === preset} onClick={() => setStyle(preset)}>
            <span>{preset}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rasio bingkai">
        {ASPECT_PRESETS.map((ratio) => (
          <Button key={ratio} type="button" size="sm" variant={aspectRatio === ratio ? 'default' : 'outline'} disabled={busy} aria-pressed={aspectRatio === ratio} onClick={() => setAspectRatio(ratio)}>
            <span>{ratio}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => void run()}>
          <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{busy ? 'Membuat gambar…' : 'Buat gambar sampul'}</span>
        </Button>
        {preview !== null ? (
          <Button type="button" size="sm" variant="default" disabled={busy} onClick={useImage}>
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gunakan gambar</span>
          </Button>
        ) : null}
      </div>
      {error !== null ? <p className="m-0 font-sans text-xs text-error" role="alert">{error}</p> : null}
      {preview !== null ? (
        <div className="space-y-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau dasbor saja; tayang publik memakai EditorialImage */}
          <img src={`data:${preview.mimeType};base64,${preview.base64}`} alt="Pratinjau sampul AI" className="max-h-60 w-full rounded border border-hairline object-cover" />
          <p className="m-0 font-mono text-[11px] text-paper-faint">Periksa gambar sebelum dipakai; penyimpanan ke media dilakukan induk.</p>
        </div>
      ) : null}
    </div>
  );
}
