export const FIGURE_MARKER_PATTERN = /^\[gambar:(\d+)\]$/u;
export const FIGURE_EXTENDED_PATTERN = /^\[gambar:(\d+)(?:\|([^\]|]*))?(?:\|([^\]]*))?\]$/u;
export const YOUTUBE_MARKER_PATTERN = /^\[youtube:([A-Za-z0-9_-]{11})\]$/u;

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;
const LINK_PATTERN = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gu;

export interface TextSegment {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly href?: string;
}

export type ArticleBlock =
  | { readonly kind: 'paragraph'; readonly segments: readonly TextSegment[] }
  | { readonly kind: 'heading'; readonly level: 2 | 3; readonly segments: readonly TextSegment[] }
  | { readonly kind: 'quote'; readonly segments: readonly TextSegment[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly TextSegment[])[] }
  | { readonly kind: 'figure'; readonly index: number; readonly alt: string; readonly caption: string }
  | { readonly kind: 'youtube'; readonly videoId: string };

function parseInline(value: string): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = /(\*\*.+?\*\*|\*[^*\n]+?\*)/gu;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > cursor) segments.push({ text: value.slice(cursor, at), bold: false, italic: false });
    const token = match[0];
    if (token.startsWith('**')) segments.push({ text: token.slice(2, -2), bold: true, italic: false });
    else segments.push({ text: token.slice(1, -1), bold: false, italic: true });
    cursor = at + token.length;
  }
  if (cursor < value.length) segments.push({ text: value.slice(cursor), bold: false, italic: false });
  return segments.filter((segment) => segment.text.length > 0);
}

function parseInlineWithLinks(value: string): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  LINK_PATTERN.lastIndex = 0;
  let cursor = 0;
  for (const match of value.matchAll(LINK_PATTERN)) {
    const at = match.index ?? 0;
    if (at > cursor) segments.push(...parseInline(value.slice(cursor, at)));
    for (const inner of parseInline(match[1]!)) segments.push({ ...inner, href: match[2]! });
    cursor = at + match[0].length;
  }
  if (cursor < value.length) segments.push(...parseInline(value.slice(cursor)));
  return segments;
}

function parseFigureMarker(line: string): ArticleBlock | null {
  const marker = FIGURE_EXTENDED_PATTERN.exec(line);
  if (marker === null) return null;
  const index = Number.parseInt(marker[1] ?? '', 10);
  if (!Number.isSafeInteger(index) || index < 1) return null;
  return { kind: 'figure', index, alt: (marker[2] ?? '').trim(), caption: (marker[3] ?? '').trim() };
}

/**
 * Split an article body into render blocks: headings, paragraphs, quotes, lists, figures, and embeds.
 *
 * @param body - Canonical body (supports `**tebal**`, `*miring*`, `[teks](https://…)`, `## H2`, `### H3`, `> kutipan`, `- item`, standalone `[gambar:N|alt|caption]` and `[youtube:VIDEO_ID]`).
 * @returns Ordered blocks; unknown syntax renders as-is.
 */
export function parseArticleBody(body: string): readonly ArticleBlock[] {
  const normalized = body.replace(/\r\n?/gu, '\n');
  const blocks: ArticleBlock[] = [];
  const chunks = normalized.split(/\n{2,}/u);
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) continue;
    if (lines.length === 1) {
      const first = lines[0]!;
      const figure = parseFigureMarker(first);
      if (figure !== null) {
        blocks.push(figure);
        continue;
      }
      const youtube = YOUTUBE_MARKER_PATTERN.exec(first);
      if (youtube !== null && YOUTUBE_ID_PATTERN.test(youtube[1] ?? '')) {
        blocks.push({ kind: 'youtube', videoId: youtube[1]! });
        continue;
      }
      if (first.startsWith('### ')) {
        const segments = parseInlineWithLinks(first.slice(4).trim());
        if (segments.length > 0) blocks.push({ kind: 'heading', level: 3, segments });
        continue;
      }
      if (first.startsWith('## ')) {
        const segments = parseInlineWithLinks(first.slice(3).trim());
        if (segments.length > 0) blocks.push({ kind: 'heading', level: 2, segments });
        continue;
      }
    }
    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({ kind: 'list', items: lines.map((line) => parseInlineWithLinks(line.slice(2).trim())).filter((item) => item.length > 0) });
      continue;
    }
    if (lines.every((line) => line.startsWith('> '))) {
      const segments = parseInlineWithLinks(lines.map((line) => line.slice(2).trim()).join('\n'));
      if (segments.length > 0) blocks.push({ kind: 'quote', segments });
      continue;
    }
    const segments = parseInlineWithLinks(lines.join('\n'));
    if (segments.length > 0) blocks.push({ kind: 'paragraph', segments });
  }
  return blocks;
}

/**
 * Reduce a body to plain text for excerpts, summaries, and search.
 *
 * @param body - Canonical article body.
 * @returns Text without markup; figures and embeds are removed.
 */
export function articleBodyText(body: string): string {
  const parts: string[] = [];
  for (const block of parseArticleBody(body)) {
    if (block.kind === 'figure' || block.kind === 'youtube') continue;
    if (block.kind === 'list') {
      for (const item of block.items) parts.push(item.map((segment) => segment.text).join(''));
      continue;
    }
    parts.push(block.segments.map((segment) => segment.text).join('').replace(/\n/gu, ' '));
  }
  return parts.join(' ').replace(/\s+/gu, ' ').trim();
}
