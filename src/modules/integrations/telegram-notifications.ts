const MESSAGE_MAX_LENGTH = 4000;
const TITLE_MAX_LENGTH = 140;
const TARGET_LIST_LIMIT = 5;
const TIME_ZONE_ID = 'Asia/Jakarta';

const FAILURE_REASONS: Readonly<Record<string, string>> = Object.freeze({
  retry_exhausted: 'batas percobaan habis',
  dispatch_exhausted: 'penjadwalan ke portal gagal',
  lease_expired: 'pekerja kehabisan waktu',
  dependency_unavailable: 'layanan tujuan tidak tersedia',
  dependency_failure: 'layanan tujuan tidak tersedia',
});

function truncateTitle(title: string): string {
  const clean = title.trim().replace(/\s+/g, ' ');
  return clean.length <= TITLE_MAX_LENGTH ? clean : `${clean.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

function formatFinishedAt(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE_ID }).format(parsed);
}

/**
 * Merender pemberitahuan grup untuk draf artikel yang baru dibuat.
 *
 * @param input - Identitas artikel dan tautan Mini App redaksi.
 * @returns Teks pesan satu gaya, tanpa format khusus.
 */
export function composeArticleCreated(input: { readonly articleId: string; readonly title: string; readonly miniAppUrl: string }): string {
  return [
    'Draf artikel baru dibuat.',
    '',
    `Judul: ${truncateTitle(input.title)}`,
    `ID artikel: ${input.articleId}`,
    '',
    'Tugaskan portal dan terbitkan dari Mini App redaksi:',
    input.miniAppUrl,
  ].join('\n');
}

/**
 * Merender pemberitahuan grup untuk pekerjaan penerbitan yang tuntas.
 *
 * @param input - Judul artikel, target tayang, dan waktu selesai.
 * @returns Teks pesan satu gaya, tanpa format khusus.
 */
export function composeJobPublished(input: {
  readonly title: string;
  readonly published: readonly { readonly hostname: string; readonly url: string }[];
  readonly finishedAt: string;
}): string {
  const shown = input.published.slice(0, TARGET_LIST_LIMIT);
  const rest = input.published.length - shown.length;
  const lines = [
    'Penerbitan selesai.',
    '',
    `Judul: ${truncateTitle(input.title)}`,
    `Tayang di ${input.published.length} portal:`,
    ...shown.flatMap((target) => [`- ${target.hostname}`, `  ${target.url}`]),
    ...(rest > 0 ? [`… dan ${rest} portal lainnya.`] : []),
    '',
    `Selesai: ${formatFinishedAt(input.finishedAt)}`,
  ];
  return lines.join('\n');
}

/**
 * Merender pemberitahuan grup untuk pekerjaan penerbitan yang gagal final.
 *
 * @param input - Judul artikel, portal gagal per kode galat, dan tautan Mini App.
 * @returns Teks pesan satu gaya, tanpa format khusus.
 */
export function composeJobFailed(input: {
  readonly title: string;
  readonly jobId: string;
  readonly failures: readonly { readonly hostname: string; readonly code: string }[];
  readonly publishedHostnames?: readonly string[] | undefined;
  readonly miniAppUrl: string;
}): string {
  const shown = input.failures.slice(0, TARGET_LIST_LIMIT);
  const rest = input.failures.length - shown.length;
  const published = input.publishedHostnames ?? [];
  const lines = [
    published.length === 0 ? 'Penerbitan gagal dan tidak dicoba ulang otomatis.' : 'Penerbitan selesai sebagian.',
    '',
    `Judul: ${truncateTitle(input.title)}`,
    `ID pekerjaan: ${input.jobId}`,
    `Gagal di ${input.failures.length} portal:`,
    ...shown.map((failure) => `- ${failure.hostname}: ${FAILURE_REASONS[failure.code] ?? 'kesalahan internal portal'}`),
    ...(rest > 0 ? [`… dan ${rest} portal lainnya.`] : []),
    ...(published.length === 0 ? [] : [`Tetap tayang di: ${published.join(', ')}.`]),
    '',
    'Periksa dan ulangi dari Mini App redaksi:',
    input.miniAppUrl,
  ];
  return lines.join('\n');
}

/**
 * Memastikan teks pemberitahuan muat di batas pesan Telegram.
 *
 * @param text - Teks hasil komposer.
 * @returns True bila dalam batas kirim Bot API.
 */
export function fitsTelegramLimit(text: string): boolean {
  return text.length <= MESSAGE_MAX_LENGTH;
}
