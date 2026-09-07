'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Input } from '@/components/ui/input';
import { formatBytes, prepareImageUpload } from '@/modules/publishing/compress-image';

export function MediaForm({
  data,
  command,
}: {
  readonly data: unknown;
  readonly command: (action: string, payload: unknown) => Promise<unknown>;
}) {
  const model = data as {
    readonly articles?: readonly { readonly id: string }[];
    readonly sites?: readonly { readonly id: string; readonly normalizedHostname: string }[];
  } | null;

  const fileInputId = useId();
  const purposeInputId = useId();
  const ownerKindSelectId = useId();
  const ownerSelectId = useId();

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, startUploadTransition] = useTransition();

  const handleUpload = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const file = values.get('file');

    if (!(file instanceof File) || file.size === 0) {
      setUploadStatus('Silakan pilih berkas media yang valid.');
      return;
    }

    startUploadTransition(async () => {
      try {
        setUploadStatus('Menganalisis & mengompresi gambar di perangkat…');
        const prepared = await prepareImageUpload(file);
        const checksum = prepared.checksum;
        if (prepared.mode === 'compressed') {
          setUploadStatus(
            `Terkompresi ${formatBytes(file.size)} → ${formatBytes(prepared.sizeBytes)} (WebP). Membuat reservasi penyimpanan bucket...`,
          );
        } else {
          setUploadStatus('Gambar sudah efisien, lanjut tanpa kompresi ulang...');
        }

        const ownerKind = String(values.get('ownerKind'));
        const ownerId = String(values.get('ownerId'));
        const owner =
          ownerKind === 'article'
            ? { kind: 'article', articleId: ownerId }
            : ownerKind === 'site'
              ? { kind: 'site', siteId: ownerId }
              : { kind: 'organization' };

        const thumbSpec = prepared.thumb === null ? null : {
          mediaType: 'image/webp' as const,
          sizeBytes: prepared.thumb.sizeBytes,
          checksum: prepared.thumb.checksum,
        };
        const reserved = (await command('media.reserve', {
          filename: prepared.filename,
          mediaType: prepared.mediaType,
          sizeBytes: prepared.sizeBytes,
          checksum,
          purpose: values.get('purpose'),
          owner,
          ...(thumbSpec === null ? {} : { thumb: thumbSpec }),
        })) as {
          readonly reservationId?: string;
          readonly authorization?: {
            readonly url?: string;
            readonly requiredHeaders?: Record<string, string>;
          };
          readonly thumb?: {
            readonly objectKey?: string;
            readonly authorization?: {
              readonly url?: string;
              readonly requiredHeaders?: Record<string, string>;
            };
          } | null;
        } | null;

        if (
          !reserved?.reservationId ||
          !reserved.authorization?.url ||
          !reserved.authorization.requiredHeaders
        ) {
          setUploadStatus('Gagal mendapatkan otorisasi reservasi penyimpanan.');
          return;
        }

        setUploadStatus('Mengunggah berkas ke object storage...');
        const uploadResponse = await fetch(reserved.authorization.url, {
          method: 'PUT',
          headers: reserved.authorization.requiredHeaders,
          body: prepared.blob,
        });

        if (!uploadResponse.ok) {
          setUploadStatus('Kegagalan transfer data saat transmisi stream.');
          return;
        }

        // Varian thumb bersifat best-effort: kegagalannya tidak menggagalkan aset utama.
        let thumbPayload: { readonly sizeBytes: number; readonly checksum: string } | undefined;
        const thumbAuth = reserved.thumb?.authorization;
        if (prepared.thumb !== null && thumbAuth?.url !== undefined && thumbAuth.requiredHeaders !== undefined) {
          setUploadStatus('Mengunggah varian thumb untuk listing…');
          const thumbResponse = await fetch(thumbAuth.url, {
            method: 'PUT',
            headers: thumbAuth.requiredHeaders,
            body: prepared.thumb.blob,
          });
          if (thumbResponse.ok) {
            thumbPayload = { sizeBytes: prepared.thumb.sizeBytes, checksum: prepared.thumb.checksum };
          }
        }

        setUploadStatus('Menyelesaikan verifikasi manifest aset...');
        await command('media.complete', thumbPayload === undefined ? { reservationId: reserved.reservationId } : { reservationId: reserved.reservationId, thumb: thumbPayload });

        setUploadStatus('Aset media berhasil diverifikasi dan disimpan.');
        form.reset();
      } catch {
        setUploadStatus('Terjadi kendala jaringan selama proses pengunggahan.');
      }
    });
  };

  return (
    <div>
      <SectionCard icon={UploadCloud} title="Unggah media" eyebrow="Verifikasi SHA-256">

        <form onSubmit={handleUpload} className="space-y-3.5">
          <div className="space-y-1.5">
            <label htmlFor={fileInputId} className="font-mono text-xs text-paper-dim">
              Pilih Berkas Gambar (JPEG, PNG, WebP, AVIF)
            </label>
            <Input
              id={fileInputId}
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              required
              disabled={isUploading}
              className="h-9 rounded border-hairline-strong bg-bg p-1 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass file:mr-2 file:rounded file:border-0 file:bg-bg-raised-2 file:px-2 file:py-1 file:font-mono file:text-[11px] file:text-paper"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={purposeInputId} className="font-mono text-xs text-paper-dim">
              Tujuan Penggunaan (Purpose)
            </label>
            <Input
              id={purposeInputId}
              name="purpose"
              required
              disabled={isUploading}
              placeholder="hero_banner, logo, atau inline_article"
              className="h-8 rounded border-hairline-strong bg-bg px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={ownerKindSelectId} className="font-mono text-xs text-paper-dim">
                Tipe Kepemilikan
              </label>
              <select
                id={ownerKindSelectId}
                name="ownerKind"
                disabled={isUploading}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="organization">Organisasi (Global Asset)</option>
                <option value="article">Artikel Spesifik</option>
                <option value="site">Portal / Site Spesifik</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={ownerSelectId} className="font-mono text-xs text-paper-dim">
                ID Entitas Pemilik
              </label>
              <select
                id={ownerSelectId}
                name="ownerId"
                disabled={isUploading}
                className="h-8 w-full rounded border border-hairline-strong bg-bg px-2 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus:border-brass focus:outline-none"
              >
                <option value="">Organisasi Induk</option>
                {model?.articles?.map((item) => (
                  <option key={item.id} value={item.id}>
                    Artikel: {item.id}
                  </option>
                ))}
                {model?.sites?.map((item) => (
                  <option key={item.id} value={item.id}>
                    Site: {item.normalizedHostname}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {uploadStatus ? (
            <div className="rounded border border-hairline bg-bg p-2.5 font-mono text-xs text-paper-dim">
              {uploadStatus}
            </div>
          ) : null}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isUploading}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded bg-brass px-3.5 font-sans text-xs font-semibold text-bg transition-colors duration-180 hover:bg-brass-soft disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Otorisasi & Unggah Aset</span>
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}