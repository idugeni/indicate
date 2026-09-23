'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { SectionCard } from '@/modules/dashboard/components/shared/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardSelect, DashboardSelectItem } from '@/modules/dashboard/components/shared/dashboard-select';
import { formatBytes, prepareImageUpload } from '@/modules/publishing/compress-image';
import { MEDIA_PURPOSES } from '@/modules/publishing/object-key';

const SUPPORTED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/x-icon',
]);

const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

function isHeicFile(file: File): boolean {
  return HEIC_TYPES.has(file.type) || /\.hei[cf]$/iu.test(file.name);
}

function heicStem(filename: string): string {
  const stem = filename.replace(/\.[a-z0-9]{1,10}$/iu, '');
  return stem === '' ? 'file' : stem;
}

/**
 * Render the media upload form with compression and client-side reservation.
 *
 * @remarks SUPPORTED_MEDIA_TYPES mirrors media_policy.allowed_mime_types so unsupported formats are rejected with a clear message before server reservation. The thumb variant is best-effort: its failure does not fail the main asset.
 */
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
        let source = file;
        if (isHeicFile(file)) {
          setUploadStatus('Mengonversi HEIC ke JPEG di perangkat…');
          let converted: Blob | Blob[];
          try {
            const { default: heic2any } = await import('heic2any');
            converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
          } catch {
            setUploadStatus('Gagal mengonversi HEIC. Coba simpan ulang foto sebagai JPG dari galeri lalu unggah lagi.');
            return;
          }
          const first = Array.isArray(converted) ? converted[0] : converted;
          if (!(first instanceof Blob) || first.size === 0) {
            setUploadStatus('Gagal mengonversi HEIC. Coba simpan ulang foto sebagai JPG dari galeri lalu unggah lagi.');
            return;
          }
          source = new File([first], `${heicStem(file.name)}.jpg`, { type: 'image/jpeg' });
        }
        setUploadStatus('Menganalisis & mengompresi gambar di perangkat…');
        const prepared = await prepareImageUpload(source);
        if (!SUPPORTED_MEDIA_TYPES.has(prepared.mediaType)) {
          setUploadStatus(
            `Format ${prepared.mediaType === '' ? 'berkas ini' : prepared.mediaType} belum didukung. Gunakan JPEG, PNG, WebP, AVIF, atau ICO.`,
          );
          return;
        }
        const checksum = prepared.checksum;
        if (prepared.mode === 'compressed') {
          setUploadStatus(
            `Terkompresi ${formatBytes(source.size)} → ${formatBytes(prepared.sizeBytes)} (WebP). Menyiapkan tempat penyimpanan...`,
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
          setUploadStatus('Gagal menyiapkan penyimpanan. Coba lagi.');
          return;
        }

        setUploadStatus('Mengunggah berkas...');
        const uploadResponse = await fetch(reserved.authorization.url, {
          method: 'PUT',
          headers: reserved.authorization.requiredHeaders,
          body: prepared.blob,
        });

        if (!uploadResponse.ok) {
          setUploadStatus('Gagal mengunggah. Periksa koneksi lalu coba lagi.');
          return;
        }

        let thumbPayload: { readonly sizeBytes: number; readonly checksum: string } | undefined;
        const thumbAuth = reserved.thumb?.authorization;
        if (prepared.thumb !== null && thumbAuth?.url !== undefined && thumbAuth.requiredHeaders !== undefined) {
          setUploadStatus('Mengunggah gambar kecil (thumbnail)…');
          const thumbResponse = await fetch(thumbAuth.url, {
            method: 'PUT',
            headers: thumbAuth.requiredHeaders,
            body: prepared.thumb.blob,
          });
          if (thumbResponse.ok) {
            thumbPayload = { sizeBytes: prepared.thumb.sizeBytes, checksum: prepared.thumb.checksum };
          }
        }

        setUploadStatus('Menyelesaikan pemeriksaan berkas...');
        const completed = await command('media.complete', thumbPayload === undefined ? { reservationId: reserved.reservationId } : { reservationId: reserved.reservationId, thumb: thumbPayload });
        if (completed === null) {
          setUploadStatus('Pemeriksaan berkas gagal. Coba unggah ulang.');
          return;
        }

        setUploadStatus('Berkas berhasil diunggah dan disimpan.');
        form.reset();
      } catch {
        setUploadStatus('Terjadi kendala jaringan selama proses pengunggahan.');
      }
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SectionCard icon={UploadCloud} title="Unggah media" eyebrow="Unggah berkas">

        <form onSubmit={handleUpload} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor={fileInputId} className="font-mono text-xs text-paper-dim">
              Pilih Berkas Gambar (JPEG, PNG, WebP, AVIF, ICO, HEIC)
            </Label>
            <Input
              id={fileInputId}
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/x-icon,.ico,.heic,.heif"
              required
              disabled={isUploading}
              className="h-9 rounded border-hairline-strong bg-bg p-1 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass file:mr-2 file:rounded file:border-0 file:bg-bg-raised-2 file:px-2 file:py-1 file:font-mono file:text-[11px] file:text-paper"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={purposeInputId} className="font-mono text-xs text-paper-dim">
              Tujuan Penggunaan
            </Label>
            <DashboardSelect
              id={purposeInputId}
              name="purpose"
              required
              disabled={isUploading}
              defaultValue="organization-asset"
              placeholder="Pilih tujuan"
            >
              {MEDIA_PURPOSES.map((purpose) => (
                <DashboardSelectItem key={purpose} value={purpose}>
                  {purpose}
                </DashboardSelectItem>
              ))}
            </DashboardSelect>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={ownerKindSelectId} className="font-mono text-xs text-paper-dim">
                Kepemilikan
              </Label>
              <DashboardSelect
                id={ownerKindSelectId}
                name="ownerKind"
                disabled={isUploading}
                defaultValue="organization"
                placeholder="Pilih kepemilikan"
              >
                <DashboardSelectItem value="organization">Organisasi (umum)</DashboardSelectItem>
                <DashboardSelectItem value="article">Artikel tertentu</DashboardSelectItem>
                <DashboardSelectItem value="site">Situs tertentu</DashboardSelectItem>
              </DashboardSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={ownerSelectId} className="font-mono text-xs text-paper-dim">
                Pemilik
              </Label>
              <DashboardSelect
                id={ownerSelectId}
                name="ownerId"
                disabled={isUploading}
                placeholder="Organisasi"
              >
                <DashboardSelectItem value="">Organisasi</DashboardSelectItem>
                {model?.articles?.map((item) => (
                  <DashboardSelectItem key={item.id} value={item.id}>
                    Artikel: {item.id}
                  </DashboardSelectItem>
                ))}
                {model?.sites?.map((item) => (
                  <DashboardSelectItem key={item.id} value={item.id}>
                    Situs: {item.normalizedHostname}
                  </DashboardSelectItem>
                ))}
              </DashboardSelect>
            </div>
          </div>

          {uploadStatus ? (
            <div className="rounded border border-hairline bg-bg p-2.5 font-mono text-xs text-paper-dim">
              {uploadStatus}
            </div>
          ) : null}

          <div className="pt-2">
            <Button
              type="submit"
              variant="default"
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <UploadCloud className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>Unggah Berkas</span>
            </Button>
          </div>
        </form>
      </SectionCard>
      <aside aria-label="Panduan media" className="rounded-lg border border-hairline bg-bg-raised p-5 sm:p-6">
        <p className="m-0 font-mono text-[11px] uppercase tracking-wider text-paper-faint">Format & kepemilikan</p>
        <ul className="m-0 mt-2 list-disc space-y-1.5 pl-5 font-sans text-xs leading-relaxed text-paper-dim">
          <li>JPEG, PNG, WebP, AVIF, ICO, HEIC (dikonversi otomatis).</li>
          <li>Pilih kepemilikan organisasi, artikel, atau situs.</li>
          <li>ID gambar hasil unggahan dipakai di varian penerbitan.</li>
        </ul>
      </aside>
    </div>
  );
}