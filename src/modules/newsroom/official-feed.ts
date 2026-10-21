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
  ).replace(/[\u00a0\s]+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

function readTag(block: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(
    `<(?:[A-Za-z0-9_-]+:)?${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_-]+:)?${escaped}\\s*>`,
    'i',
  );
  return expression.exec(block)?.[1] ?? '';
}

const TRUSTED_NEWS_DOMAINS = ['ditjenpas.go.id', 'antaranews.com', 'katadata.co.id'] as const;

/** Only HTTPS article feeds from curated, publisher-owned domains are accepted. */
export function isTrustedNewsHost(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:'
      && TRUSTED_NEWS_DOMAINS.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      && url.username === ''
      && url.password === '';
  } catch {
    return false;
  }
}

/** Official Ditjenpas source page or article, excluding the homepage root. */
export function isOfficialNewsHost(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:'
      && (url.hostname === 'ditjenpas.go.id' || url.hostname.endsWith('.ditjenpas.go.id'))
      && url.username === ''
      && url.password === '';
  } catch {
    return false;
  }
}

export function isOfficialNewsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return isOfficialNewsHost(raw) && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function isTrustedNewsArticleUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!isTrustedNewsHost(raw) || url.pathname.length < 2) return false;
    const path = url.pathname.toLowerCase();
    return !path.startsWith('/rss/')
      && !path.startsWith('/category/')
      && !path.startsWith('/profile/')
      && !path.startsWith('/login')
      && !path.startsWith('/search');
  } catch {
    return false;
  }
}

function parseNewsFeed(xml: string, acceptsUrl: (url: string) => boolean): readonly OfficialNewsStory[] {
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
    if (title.length < 8 || !acceptsUrl(rawLink)) continue;
    const url = new URL(rawLink);
    url.hash = '';
    url.search = '';
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

/** Publisher-owned, curated news feeds; never accept aggregator URLs as sources. */
export function parseTrustedNewsFeed(xml: string): readonly OfficialNewsStory[] {
  return parseNewsFeed(xml, isTrustedNewsArticleUrl);
}

/** Keep a narrow parser for the official Ditjenpas feed and its tests. */
export function parseOfficialNewsFeed(xml: string): readonly OfficialNewsStory[] {
  return parseNewsFeed(xml, isOfficialNewsUrl);
}

function extractDivClassContent(html: string, className: string): string | null {
  const openingPattern = new RegExp(
    '<div\\b(?=[^>]*\\bclass="[^"]*\\b' + className + '(?:\\s|")[^"]*")[^>]*>',
    'i',
  );
  const opening = openingPattern.exec(html);
  if (opening === null) return null;

  const contentStart = opening.index + opening[0].length;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = contentStart;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = tags.exec(html)) !== null) {
    const token = match[0];
    if (token.startsWith('</')) {
      depth -= 1;
      if (depth === 0) return html.slice(contentStart, match.index);
    } else if (!token.endsWith('/>')) {
      depth += 1;
    }
  }
  return null;
}

/** Extract the primary body from approved publisher templates, excluding site chrome. */
export function extractOfficialArticleText(html: string): string {
  if (html.length === 0 || html.length > 2_000_000) return '';
  const body = extractDivClassContent(html, 'post-text')
    ?? extractDivClassContent(html, 'detail-body')
    ?? extractDivClassContent(html, 'wrap__article-detail-content')
    ?? /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1]
    ?? /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1]
    ?? html;
  return cleanText(
    body
      .replace(/<(?:nav|header|footer|aside|form|svg|script|style|noscript|iframe)\b[^>]*>[\s\S]*?<\/(?:nav|header|footer|aside|form|svg|script|style|noscript|iframe)\s*>/gi, ' ')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
  ).slice(0, 12_000);
}

/** Read news cards from the official homepage when the upstream RSS database query fails. */
export function parseOfficialNewsIndex(html: string): readonly OfficialNewsStory[] {
  if (html.length === 0 || html.length > 2_000_000) return [];
  const blocks = html.match(/<div\b[^>]*class=["'][^"']*\bpost-item-horizontal\b[^"']*["'][^>]*>[\s\S]*?<!--\s*\/\.post item\s*-->/gi) ?? [];
  const seen = new Set<string>();
  const stories: OfficialNewsStory[] = [];
  for (const block of blocks) {
    const imageAlt = /<img\b[^>]*\balt=(["'])(.*?)\1/i.exec(block)?.[2] ?? '';
    const titleAnchor = /<h[1-6]\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a\b[^>]*>([\s\S]*?)<\/a>/i.exec(block)?.[1] ?? '';
    const title = cleanText(imageAlt || titleAnchor).slice(0, 300);
    if (title.length < 8) continue;

    const links = [...block.matchAll(/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>/gi)]
      .map((match) => match[2] ?? '');
    const rawLink = links.find((href) => {
      if (!isOfficialNewsUrl(href)) return false;
      const pathname = new URL(href).pathname.toLowerCase();
      return !pathname.startsWith('/category/')
        && !pathname.startsWith('/profile/')
        && !pathname.startsWith('/rss/')
        && !pathname.startsWith('/login')
        && !pathname.startsWith('/search');
    });
    if (rawLink === undefined) continue;
    const normalized = new URL(rawLink);
    normalized.hash = '';
    normalized.search = '';
    const url = normalized.toString();
    if (seen.has(url)) continue;
    seen.add(url);

    const clock = /icon-clock[\s\S]{0,120}?<\/i>([\s\S]{0,80})/i.exec(block)?.[1] ?? '';
    const rawDate = cleanText(clock.split('<')[0] ?? '');
    const timestamp = rawDate === '' ? Number.NaN : Date.parse(rawDate);
    stories.push({
      title,
      url,
      description: '',
      publishedAt: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
    });
  }
  return stories.sort((left, right) => {
    const leftTime = left.publishedAt === null ? 0 : Date.parse(left.publishedAt);
    const rightTime = right.publishedAt === null ? 0 : Date.parse(right.publishedAt);
    return rightTime - leftTime;
  });
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
