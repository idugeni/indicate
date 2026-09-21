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
 * Render the group notification for a newly created article draft.
 *
 * @param input - Article identity and the editorial Mini App link.
 * @returns Single-style message text, no special formatting.
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
 * Render the group notification for a completed publication job.
 *
 * @param input - Article title, publish targets, and finish time.
 * @returns Single-style message text, no special formatting.
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
 * Render the group notification for a finally-failed publication job.
 *
 * @param input - Article title, portals failed per error code, and the Mini App link.
 * @returns Single-style message text, no special formatting.
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
 * Ensure notification text fits within the Telegram message limit.
 *
 * @param text - Composer-produced text.
 * @returns True when within the Bot API send limit.
 */
export function fitsTelegramLimit(text: string): boolean {
  return text.length <= MESSAGE_MAX_LENGTH;
}
