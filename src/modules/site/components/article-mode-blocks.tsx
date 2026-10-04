import { Headphones, Images, Megaphone, Play, RadioTower, Zap } from 'lucide-react';

import type { ArticleLiveblogEntry } from '@/modules/delivery/models';
import { articleTypeLabel, type ArticleType } from '@/modules/site/article-type';
import { extractYouTubeId, isSafeMediaSrc } from '@/modules/site/tiptap-document';
import { formatDate } from '@/modules/site/components/network/ui/format';
import { LiveblogAutoRefresh } from '@/modules/site/components/liveblog-auto-refresh';

/**
 * Format detik pemutaran menjadi label `M:SS` atau `H:MM:SS`.
 *
 * @param totalSeconds - Durasi detik; null berarti tidak tampil.
 * @returns Label durasi, atau null bila tidak ada durasi valid.
 */
export function formatDuration(totalSeconds: number | null): string | null {
  if (totalSeconds === null || !Number.isInteger(totalSeconds) || totalSeconds < 1) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const tail = `${String(minutes).padStart(hours > 0 ? 2 : 1, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${tail}` : tail;
}

const MODE_ICONS = {
  video: Play,
  gallery: Images,
  audio: Headphones,
  liveblog: RadioTower,
  short: Zap,
} as const;

/**
 * Lencana mode artikel yang netral terhadap tema template.
 *
 * @param type - Mode artikel; `standard` tidak menampilkan apa pun.
 * @returns Pil ikon plus label mode, atau null untuk standar.
 */
export function ArticleModeBadge({ type }: { readonly type: ArticleType }) {
  if (type === 'standard') return null;
  const Icon = MODE_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider opacity-80">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {articleTypeLabel(type)}
    </span>
  );
}

/**
 * Pemutar video mode `video`: sematan YouTube bila URL-nya YouTube, elemen video bila berkas.
 *
 * @param videoUrl - URL tonton/berkas luar; hanya `https` aman yang dirender.
 * @param durationSeconds - Durasi detik untuk label, atau null.
 * @param title - Judul artikel untuk label aksesibel.
 * @returns Blok pemutar 16:9, atau null bila URL tidak aman.
 */
export function ArticleVideoPlayer({
  videoUrl,
  durationSeconds,
  title,
}: {
  readonly videoUrl: string | null;
  readonly durationSeconds: number | null;
  readonly title: string;
}) {
  if (videoUrl === null || !isSafeMediaSrc(videoUrl)) return null;
  const youtubeId = extractYouTubeId(videoUrl);
  const duration = formatDuration(durationSeconds);
  return (
    <figure className="m-0 mt-6 overflow-hidden rounded-2xl">
      {youtubeId === null ? (
        <video controls preload="metadata" src={videoUrl} aria-label={`Video: ${title}`} className="aspect-video w-full bg-black" />
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
          // eslint-disable-next-line tooltip/no-native-tooltip -- iframe title is the WCAG accessible name, not a hover hint
          title={`Video: ${title}`}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full border-0"
        />
      )}
      {duration === null ? null : (
        <figcaption className="mt-1 font-mono text-[11px] tabular-nums opacity-70">
          Durasi {duration}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * Pemutar audio mode `audio` dengan elemen audio bawaan peramban.
 *
 * @param audioUrl - URL dengar/berkas luar; hanya `https` aman yang dirender.
 * @param durationSeconds - Durasi detik untuk label, atau null.
 * @param title - Judul artikel untuk label aksesibel.
 * @returns Blok pemutar audio, atau null bila URL tidak aman.
 */
export function ArticleAudioPlayer({
  audioUrl,
  durationSeconds,
  title,
}: {
  readonly audioUrl: string | null;
  readonly durationSeconds: number | null;
  readonly title: string;
}) {
  if (audioUrl === null || !isSafeMediaSrc(audioUrl)) return null;
  const duration = formatDuration(durationSeconds);
  return (
    <figure className="m-0 mt-6 rounded-2xl border p-4">
      <span className="mb-2 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider opacity-80">
        <Headphones className="h-4 w-4" aria-hidden="true" />
        Dengarkan
        {duration === null ? '' : ` · ${duration}`}
      </span>
      <audio controls preload="metadata" src={audioUrl} aria-label={`Audio: ${title}`} className="w-full" />
    </figure>
  );
}

/**
 * Disclosure konten bersponsor yang netral terhadap tema template.
 *
 * @param attribution - Nama penerbit/atribusi untuk kalimat disclosure.
 * @returns Baris disclosure, atau null bila bukan konten bersponsor.
 */
export function SponsoredDisclosure({
  isSponsored,
  attribution,
}: {
  readonly isSponsored: boolean;
  readonly attribution: string;
}) {
  if (!isSponsored) return null;
  return (
    <p className="m-0 mt-4 flex items-start gap-2 font-mono text-[11px] leading-relaxed opacity-70">
      <Megaphone className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
      <span>Konten bersponsor oleh {attribution}. Redaksi tidak memengaruhi isi materi ini.</span>
    </p>
  );
}

/**
 * Linimasa pembaruan mode `liveblog`, terbaru dulu.
 *
 * @param updates - Entri liveblog dari proyeksi delivery; kosong berarti tidak tampil.
 * @returns Seksi linimasa dengan penanda waktu tiap entri.
 */
export function LiveblogTimeline({ updates }: { readonly updates: readonly ArticleLiveblogEntry[] }) {
  if (updates.length === 0) return null;
  return (
    <section aria-label="Pembaruan langsung" className="mt-8 space-y-0">
      <LiveblogAutoRefresh />
      <p className="m-0 mb-3 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider opacity-80">
        <RadioTower className="h-3.5 w-3.5" aria-hidden="true" />
        Pembaruan langsung · {updates.length} entri
      </p>
      <ol className="m-0 list-none space-y-4 border-l-2 p-0 pl-5">
        {updates.map((entry, index) => (
          <li key={entry.id} className="relative">
            <span aria-hidden="true" className="absolute top-1 -left-[27px] h-2.5 w-2.5 rounded-full border-2" />
            <p className="m-0 font-mono text-[11px] tabular-nums opacity-70">
              #{updates.length - index} · <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt, 'long')}</time>
            </p>
            <p className="m-0 mt-1 whitespace-pre-wrap font-sans text-[15px] leading-relaxed">{entry.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
