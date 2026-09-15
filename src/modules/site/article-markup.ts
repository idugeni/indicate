export const FIGURE_MARKER_PATTERN = /^\[gambar:(\d+)\]$/u;

export interface TextSegment {
  readonly text: string;
  readonly bold: boolean;
  readonly italic: boolean;
}

export type ArticleBlock =
  | { readonly kind: 'paragraph'; readonly segments: readonly TextSegment[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly TextSegment[])[] }
  | { readonly kind: 'figure'; readonly index: number };

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

/**
 * Memecah body artikel menjadi blok render: paragraf, daftar, dan gambar.
 *
 * @param body - Body kanonik (mendukung `**tebal**`, `*miring*`, `- item`, `[gambar:N]` sebaris sendiri).
 * @returns Blok berurutan; sintaks tak dikenal tampil apa adanya.
 */
export function parseArticleBody(body: string): readonly ArticleBlock[] {
  const normalized = body.replace(/\r\n?/gu, '\n');
  const blocks: ArticleBlock[] = [];
  const chunks = normalized.split(/\n{2,}/u);
  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) continue;
    if (lines.length === 1) {
      const marker = FIGURE_MARKER_PATTERN.exec(lines[0]!);
      if (marker !== null) {
        const index = Number.parseInt(marker[1]!, 10);
        if (Number.isSafeInteger(index) && index >= 1) {
          blocks.push({ kind: 'figure', index });
          continue;
        }
      }
    }
    if (lines.every((line) => line.startsWith('- '))) {
      blocks.push({ kind: 'list', items: lines.map((line) => parseInline(line.slice(2).trim())).filter((item) => item.length > 0) });
      continue;
    }
    const segments = parseInline(lines.join('\n'));
    if (segments.length > 0) blocks.push({ kind: 'paragraph', segments });
  }
  return blocks;
}

/**
 * Mereduksi body menjadi teks polos untuk excerpt, ringkasan, dan pencarian.
 *
 * @param body - Body kanonik artikel.
 * @returns Teks tanpa markup; penanda gambar dihilangkan.
 */
export function articleBodyText(body: string): string {
  const parts: string[] = [];
  for (const block of parseArticleBody(body)) {
    if (block.kind === 'figure') continue;
    if (block.kind === 'list') {
      for (const item of block.items) parts.push(item.map((segment) => segment.text).join(''));
      continue;
    }
    parts.push(block.segments.map((segment) => segment.text).join('').replace(/\n/gu, ' '));
  }
  return parts.join(' ').replace(/\s+/gu, ' ').trim();
}
