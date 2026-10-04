'use client';

import { useId } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { FieldDescription } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchCombobox } from '@/modules/dashboard/components/shared/search-combobox';
import {
  ARTICLE_TYPES,
  articleTypeHint,
  articleTypeLabel,
  SHORT_BODY_MAX,
  youtubeThumbnailUrl,
  type ArticleType,
} from '@/modules/site/article-type';

const MODE_OPTIONS = ARTICLE_TYPES.map((type) => ({ value: type, label: articleTypeLabel(type) }));

/**
 * Pemilih mode artikel beserta isian khusus tiap mode.
 *
 * @param type - Mode aktif; `standard` tanpa syarat tambahan.
 * @param onTypeChange - Dipanggil saat redaktur mengganti mode.
 * @param videoUrl - URL tonton/berkas luar untuk mode `video`.
 * @param audioUrl - URL dengar/berkas luar untuk mode `audio`.
 * @param durationInput - Durasi detik sebagai teks digit untuk `video`/`audio`.
 * @param isSponsored - Tandai konten berbayar untuk disclosure bersponsor.
 * @param shortLength - Panjang isi ter-trim; hanya relevan untuk mode `short`, null untuk mode lain.
 * @param imageCount - Jumlah gambar di editor untuk panduan mode `gallery`.
 * @param modeProblem - Pesan validasi silang mode dari pemilik form; null bila lolos.
 * @param hasVideoCover - True bila mode `video` sudah didukung sampul; dipakai untuk teks panduan.
 * @param disabled - Kunci semua kendali saat menyimpan.
 * @returns Seksi mode dengan validasi hidup per mode.
 *
 * @remarks Kontrak isian tiap mode:
 * - `standard`: naskah biasa; sampul opsional.
 * - `video`: wajib salah satu dari URL video, sampul, atau sematan video di isi; durasi dianjurkan.
 * - `gallery`: rangkaian foto dari gambar isi + sampul sebagai gambar utama; tanpa kolom skalar tambahan.
 * - `audio`: wajib URL audio; durasi dianjurkan; cocok diisi lewat Audio jadi berita.
 * - `liveblog`: wajib dokumen terstruktur; entri pembaruan dikelola setelah artikel tersimpan.
 * - `short`: isi ter-trim maksimal 500 karakter; judul satu sudut.
 */
export function ArticleModeFields({
  type,
  onTypeChange,
  videoUrl,
  onVideoUrlChange,
  audioUrl,
  onAudioUrlChange,
  durationInput,
  onDurationInputChange,
  isSponsored,
  onSponsoredChange,
  shortLength,
  imageCount,
  modeProblem,
  hasVideoCover,
  disabled,
}: {
  readonly type: ArticleType;
  readonly onTypeChange: (next: ArticleType) => void;
  readonly videoUrl: string;
  readonly onVideoUrlChange: (next: string) => void;
  readonly audioUrl: string;
  readonly onAudioUrlChange: (next: string) => void;
  readonly durationInput: string;
  readonly onDurationInputChange: (next: string) => void;
  readonly isSponsored: boolean;
  readonly onSponsoredChange: (next: boolean) => void;
  readonly shortLength: number | null;
  readonly imageCount: number;
  readonly modeProblem: string | null;
  readonly hasVideoCover: boolean;
  readonly disabled: boolean;
}) {
  const modeSelectId = useId();
  const videoInputId = useId();
  const audioInputId = useId();
  const durationInputId = useId();
  const sponsoredCheckId = useId();
  const shortOver = shortLength !== null && shortLength > SHORT_BODY_MAX;

  return (
    <div className="space-y-4 border-t border-hairline pt-8">
      <div className="space-y-1.5">
        <Label htmlFor={modeSelectId} className="font-mono text-xs text-paper-dim">
          Mode artikel
        </Label>
        <SearchCombobox
          id={modeSelectId}
          name="articleType"
          required
          disabled={disabled}
          placeholder="Pilih mode"
          value={type}
          onValueChange={(next) => {
            if (next === null) return;
            const found = ARTICLE_TYPES.find((mode) => mode === next);
            if (found !== undefined) onTypeChange(found);
          }}
          options={MODE_OPTIONS}
          ariaLabel="Mode artikel"
        />
        <FieldDescription className="font-mono text-[11px] text-paper-faint">
          {articleTypeHint(type)}
        </FieldDescription>
      </div>

      {type === 'video' ? (
        <div className="space-y-3 rounded-md border border-hairline bg-bg p-3">
          <div className="space-y-1.5">
            <Label htmlFor={videoInputId} className="font-mono text-xs text-paper-dim">
              URL video
            </Label>
            <Input
              id={videoInputId}
              name="videoUrl"
              value={videoUrl}
              onChange={(event) => onVideoUrlChange(event.target.value)}
              disabled={disabled}
              placeholder="https://... (tautan tonton atau berkas)"
              inputMode="url"
              className="h-8 rounded border-hairline-strong bg-bg-raised px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
            <p className="m-0 font-mono text-[11px] text-paper-faint">
              Wajib salah satu: URL video, sampul terunggah, URL sampul luar, atau sematan video di isi.
              {hasVideoCover ? ' Sampul sudah terisi.' : ''}
            </p>
            {youtubeThumbnailUrl(videoUrl) === null ? null : (
              <div className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- dashboard preview only; public delivery uses EditorialImage */}
                <img
                  src={youtubeThumbnailUrl(videoUrl) as string}
                  alt="Pratinjau sampul otomatis YouTube"
                  className="max-h-40 w-full rounded border border-hairline object-cover"
                />
                <p className="m-0 font-mono text-[11px] text-paper-faint">
                  Thumbnail YouTube dipakai otomatis sebagai sampul bila sampul kosong.
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={durationInputId} className="font-mono text-xs text-paper-dim">
              Durasi (detik, opsional)
            </Label>
            <Input
              id={durationInputId}
              name="durationSeconds"
              value={durationInput}
              onChange={(event) => onDurationInputChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
              disabled={disabled}
              placeholder="cth: 180"
              inputMode="numeric"
              className="h-8 rounded border-hairline-strong bg-bg-raised px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>
        </div>
      ) : null}

      {type === 'gallery' ? (
        <p className="m-0 rounded-md border border-hairline bg-bg p-3 font-mono text-[11px] leading-relaxed text-paper-faint" role="note">
          {imageCount === 0
            ? 'Sisipkan foto lewat tombol Gambar di editor — tiap gambar otomatis jadi anggota galeri. Sampul dianjurkan sebagai gambar utama.'
            : `${imageCount} gambar di isi akan tampil sebagai galeri di halaman artikel.`}
        </p>
      ) : null}

      {type === 'audio' ? (
        <div className="space-y-3 rounded-md border border-hairline bg-bg p-3">
          <div className="space-y-1.5">
            <Label htmlFor={audioInputId} className="font-mono text-xs text-paper-dim">
              URL audio (wajib)
            </Label>
            <Input
              id={audioInputId}
              name="audioUrl"
              required
              value={audioUrl}
              onChange={(event) => onAudioUrlChange(event.target.value)}
              disabled={disabled}
              placeholder="https://... (berkas mp3/m4a atau tautan dengar)"
              inputMode="url"
              className="h-8 rounded border-hairline-strong bg-bg-raised px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
            <p className="m-0 font-mono text-[11px] text-paper-faint">
              Naskah di bawah jadi pendamping rekaman — cocok diisi lewat Audio jadi berita.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={durationInputId} className="font-mono text-xs text-paper-dim">
              Durasi (detik, opsional)
            </Label>
            <Input
              id={durationInputId}
              name="durationSeconds"
              value={durationInput}
              onChange={(event) => onDurationInputChange(event.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
              disabled={disabled}
              placeholder="cth: 300"
              inputMode="numeric"
              className="h-8 rounded border-hairline-strong bg-bg-raised px-2.5 font-mono text-xs text-paper transition-colors duration-180 hover:border-hairline focus-visible:ring-brass"
            />
          </div>
        </div>
      ) : null}

      {type === 'liveblog' ? (
        <p className="m-0 rounded-md border border-hairline bg-bg p-3 font-mono text-[11px] leading-relaxed text-paper-faint" role="note">
          Isi di bawah jadi ringkasan pembuka. Entri pembaruan dikelola lewat panel Pembaruan langsung setelah artikel tersimpan.
        </p>
      ) : null}

      {type === 'short' && shortLength !== null ? (
        <p className={`m-0 font-mono text-[11px] tabular-nums ${shortOver ? 'text-error' : 'text-paper-faint'}`} role={shortOver ? 'alert' : 'note'}>
          {shortLength}/{SHORT_BODY_MAX} karakter{shortOver ? ' — pangkas isi atau ganti ke mode standar.' : '. Judul satu sudut, tanpa pengembangan fakta.'}
        </p>
      ) : null}

      {modeProblem !== null ? (
        <p className="m-0 font-mono text-[11px] text-error" role="alert">
          {modeProblem}
        </p>
      ) : null}

      <div className="flex items-start gap-2 rounded border border-hairline bg-bg p-2.5">
        <Checkbox
          id={sponsoredCheckId}
          checked={isSponsored}
          onCheckedChange={(checked) => onSponsoredChange(checked === true)}
          disabled={disabled}
          className="mt-0.5 border-hairline-strong data-checked:border-brass data-checked:bg-brass data-checked:text-bg"
        />
        <div className="min-w-0 space-y-0.5">
          <Label htmlFor={sponsoredCheckId} className="font-mono text-xs text-paper">
            Konten bersponsor
          </Label>
          <p className="m-0 font-mono text-[11px] leading-relaxed text-paper-faint">
            Menampilkan disclosure bersponsor di halaman artikel.
          </p>
        </div>
      </div>
    </div>
  );
}
