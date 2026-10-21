export interface OfficialNewsStory {
  readonly title: string;
  readonly url: string;
  readonly description: string;
  readonly publishedAt: string | null;
}

const MAX_FEED_LENGTH = 1_000_000;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_match, decimal: string) => {
      const code = Number(decimal);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([\da-f]+);/gi, (_match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    });
}

function cleanText(value: string): string {
  return decodeEntities(
    value
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/[\u00a0\s]+/g, ' ').trim();
}

function readTag(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${escaped}\\s*>`,
    'i',
  );
  return expression.exec(block)?.[1] ?? '';
}

/** Only the explicitly approved official Ditjenpas host may become a generation source. */
export function isOfficialNewsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:'
      && (url.hostname === 'ditjenpas.go.id' || url.hostname.endsWith('.ditjenpas.go.id'))
      && url.username === ''
      && url.password === ''
      && url.pathname.length > 1;
  } catch {
    return false;
  }
}

/**
 * Parse a bounded RSS 2.0 feed without evaluating XML entities or remote DTDs.
 * Entries are deduplicated and ordered newest-first, with off-domain links rejected.
 */
export function parseOfficialNewsFeed(xml: string): readonly OfficialNewsStory[] {
  if (xml.length === 0 || xml.length > MAX_FEED_LENGTH || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return [];
  }
  const blocks = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? [];
  const seen = new Set<string>();
  const stories: OfficialNewsStory[] = [];
  for (const block of blocks) {
    const title = cleanText(readTag(block, 'title')).slice(0, 300);
    const rawLink = cleanText(readTag(block, 'link'));
    const description = cleanText(readTag(block, 'encoded') || readTag(block, 'description')).slice(0, 6000);
    const rawDate = cleanText(readTag(block, 'pubDate') || readTag(block, 'date'));
    if (title.length < 8 || !isOfficialNewsUrl(rawLink)) continue;
    const url = new URL(rawLink);
    url.hash = '';
    const normalizedUrl = url.toString();
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);
    const parsedDate = rawDate === '' ? Number.NaN : Date.parse(rawDate);
    stories.push({
      title,
      url: normalizedUrl,
      description,
      publishedAt: Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : null,
    });
  }
  return stories.sort((left, right) => {
    const leftTime = left.publishedAt === null ? 0 : Date.parse(left.publishedAt);
    const rightTime = right.publishedAt === null ? 0 : Date.parse(right.publishedAt);
    return rightTime - leftTime;
  });
}

/** Extract readable article text while discarding script/style and page chrome. */
export function extractOfficialArticleText(html: string): string {
  if (html.length === 0) return '';
  const article = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1]
    ?? /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1]
    ?? html;
  return cleanText(
    article
      .replace(/<(?:nav|header|footer|aside|form|svg|script|style|noscript)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside|form|svg|script|style|noscript)\s*>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
  ).slice(0, 12_000);
}

/** Stable Indonesian calendar-day key (Asia/Jakarta, not the server's UTC day). */
export function jakartaDayKey(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
