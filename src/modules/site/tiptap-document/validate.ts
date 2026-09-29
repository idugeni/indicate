import {
  extractDriveUrl,
  extractFacebookUrl,
  extractInstagramUrl,
  extractTikTokUrl,
  extractTweetUrl,
  extractYouTubeId,
} from '@/modules/site/tiptap-document/embeds';
import { isSafeLinkUrl, isSafeMediaSrc } from '@/modules/site/tiptap-document/url-safety';
import {
  ALLOWED_MARKS,
  ALLOWED_NODES,
  COLOR_PATTERN,
  isRecord,
  isTipTapDoc,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS,
  TEXT_ALIGN_VALUES,
  TIPTAP_MAX_DEPTH,
  TIPTAP_MAX_NODES,
  TIPTAP_MAX_TEXT_LENGTH,
  UUID_PATTERN,
  type TipTapDoc,
  type TipTapNode,
} from '@/modules/site/tiptap-document/types';

/**
 * Buang atribut bernilai `null` dari satu kumpulan atribut.
 *
 * @param attrs - Atribut node atau mark hasil serialisasi editor.
 * @returns Atribut asli bila tidak ada nilai null, `{...}` bila tersisa sebagian, atau null bila kosong.
 */
function compactAttrs(attrs: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> | null {
  const kept = Object.entries(attrs).filter(([, value]) => value !== null && value !== undefined);
  if (kept.length === Object.keys(attrs).length) return attrs;
  return kept.length === 0 ? null : Object.fromEntries(kept);
}

/**
 * Buang atribut bernilai `null` dari satu node, mark, dan seluruh keturunannya.
 *
 * @param node - Node hasil serialisasi editor.
 * @returns Node asli bila tidak ada atribut null; selain itu salinan ringkas.
 * @remarks ProseMirror menyertakan seluruh atribut skema saat `toJSON()`, jadi
 * paragraf yang tidak diratakan tetap membawa `textAlign: null` dan teks tanpa
 * warna tetap membawa `textStyle.color: null`. Keduanya berarti "tidak diset",
 * bukan "tidak valid", dan tidak perlu ikut tersimpan.
 */
function compactTipTapNode(node: TipTapNode): TipTapNode {
  const attrs = isRecord(node.attrs) ? compactAttrs(node.attrs) : null;
  const marks = node.marks?.map((mark) => {
    const markAttrs = isRecord(mark.attrs) ? compactAttrs(mark.attrs) : null;
    return markAttrs === null ? (isRecord(mark.attrs) ? { type: mark.type } : mark) : { ...mark, attrs: markAttrs };
  });
  const content = node.content?.map(compactTipTapNode);
  const shrank =
    attrs !== (isRecord(node.attrs) ? node.attrs : null)
    || (marks !== undefined && marks.some((mark, index) => mark !== node.marks?.[index]))
    || (content !== undefined && content.some((child, index) => child !== node.content?.[index]));
  if (!shrank) return node;
  const next: Record<string, unknown> = { ...node };
  if (attrs === null) delete next.attrs;
  else next.attrs = attrs;
  if (marks !== undefined) next.marks = marks;
  if (content !== undefined) next.content = content;
  return next as unknown as TipTapNode;
}

/**
 * Validate a TipTap document against the editorial allowlist and size bounds.
 *
 * @param value - Candidate parsed JSON.
 * @returns Valid doc when ok; otherwise a machine-readable reason.
 */
export function validateTipTapDoc(value: unknown): { readonly ok: true; readonly doc: TipTapDoc } | { readonly ok: false; readonly reason: string } {
  if (!isTipTapDoc(value)) return { ok: false, reason: 'not-a-doc' };
  const content = value.content ?? [];
  let nodes = 0;
  let textLength = 0;
  const visit = (node: TipTapNode, depth: number): string | null => {
    nodes += 1;
    if (nodes > TIPTAP_MAX_NODES) return 'too-many-nodes';
    if (depth > TIPTAP_MAX_DEPTH) return 'too-deep';
    if (!isRecord(node) || typeof node.type !== 'string' || !ALLOWED_NODES.has(node.type)) return `unsupported-node:${typeof (node as { readonly type?: unknown }).type === 'string' ? (node as { readonly type: string }).type : 'unknown'}`;
    if (node.type === 'text') {
      if (typeof node.text !== 'string') return 'text-without-string';
      textLength += Array.from(node.text).length;
      if (textLength > TIPTAP_MAX_TEXT_LENGTH) return 'text-too-long';
      for (const mark of node.marks ?? []) {
        if (!isRecord(mark) || typeof mark.type !== 'string' || !ALLOWED_MARKS.has(mark.type)) return 'unsupported-mark';
        if (mark.type === 'link') {
          const href = isRecord(mark.attrs) ? mark.attrs.href : undefined;
          if (!isSafeLinkUrl(href)) return 'unsafe-link';
        }
        if (mark.type === 'textStyle') {
          const color = isRecord(mark.attrs) ? mark.attrs.color : undefined;
          if (color !== undefined && color !== null && (typeof color !== 'string' || !COLOR_PATTERN.test(color))) return 'invalid-text-color';
        }
      }
      return null;
    }
    if (node.type === 'heading') {
      const level = isRecord(node.attrs) ? node.attrs.level : undefined;
      if (level !== 1 && level !== 2 && level !== 3 && level !== 4 && level !== 5 && level !== 6) return 'invalid-heading-level';
      const align = isRecord(node.attrs) ? node.attrs.textAlign : undefined;
      if (align !== undefined && align !== null && (typeof align !== 'string' || !TEXT_ALIGN_VALUES.has(align))) return 'invalid-text-align';
    }
    if (node.type === 'paragraph') {
      const align = isRecord(node.attrs) ? node.attrs.textAlign : undefined;
      if (align !== undefined && align !== null && (typeof align !== 'string' || !TEXT_ALIGN_VALUES.has(align))) return 'invalid-text-align';
    }
    if (node.type === 'table') {
      const children = node.content ?? [];
      if (children.length === 0 || children.length > TABLE_MAX_ROWS) return 'invalid-table-size';
      for (const row of children) {
        if (row.type !== 'tableRow') return 'invalid-table-shape';
        const cells = row.content ?? [];
        if (cells.length === 0 || cells.length > TABLE_MAX_COLS) return 'invalid-table-size';
        for (const cell of cells) {
          if (cell.type !== 'tableCell' && cell.type !== 'tableHeader') return 'invalid-table-shape';
        }
      }
    }
    if (node.type === 'image') {
      const src = isRecord(node.attrs) ? node.attrs.src : undefined;
      if (!isSafeMediaSrc(src)) return 'unsafe-image-src';
      const alt = isRecord(node.attrs) ? node.attrs.alt : undefined;
      if (alt !== undefined && alt !== null && (typeof alt !== 'string' || Array.from(alt).length > 300)) return 'invalid-image-alt';
      const title = isRecord(node.attrs) ? (node.attrs.title ?? node.attrs.caption) : undefined;
      if (title !== undefined && title !== null && (typeof title !== 'string' || Array.from(title).length > 500)) return 'invalid-image-caption';
    }
    if (node.type === 'youtube' || node.type === 'video') {
      const attrs = isRecord(node.attrs) ? node.attrs : {};
      const candidate = attrs.src ?? attrs.videoId ?? attrs.id;
      if (extractYouTubeId(candidate) === null) return 'invalid-youtube-ref';
    }
    if (node.type === 'twitter' || node.type === 'instagram' || node.type === 'tiktok' || node.type === 'facebook') {
      const attrs = isRecord(node.attrs) ? node.attrs : {};
      const src = attrs.src;
      if (typeof src !== 'string') return `invalid-${node.type}-ref`;
      const canonical =
        node.type === 'twitter' ? extractTweetUrl(src)
        : node.type === 'instagram' ? extractInstagramUrl(src)
        : node.type === 'tiktok' ? extractTikTokUrl(src)
        : extractFacebookUrl(src);
      if (canonical === null || canonical !== src) return `invalid-${node.type}-ref`;
    }
    if (node.type === 'drive') {
      const attrs = isRecord(node.attrs) ? node.attrs : {};
      const src = attrs.src;
      if (typeof src !== 'string' || extractDriveUrl(src) !== src) return 'invalid-drive-ref';
    }
    for (const child of node.content ?? []) {
      const failure = visit(child, depth + 1);
      if (failure !== null) return failure;
    }
    return null;
  };
  for (const child of content) {
    const failure = visit(child, 1);
    if (failure !== null) return { ok: false, reason: failure };
  }
  const compacted = content.map((node) => compactTipTapNode(node));
  return { ok: true, doc: { type: 'doc', content: compacted } };
}

/**
 * Extract inline image references from a TipTap document in document order.
 *
 * @param doc - Validated or untrusted TipTap JSON; invalid input yields an empty list.
 * @returns Ordered `{ mediaId, alt, caption }` triples for `media:<uuid>` image sources; unsafe sources are skipped.
 */
export function extractTipTapImages(doc: unknown): readonly { readonly mediaId: string; readonly alt: string | null; readonly caption: string | null }[] {
  if (!isTipTapDoc(doc)) return [];
  const images: { readonly mediaId: string; readonly alt: string | null; readonly caption: string | null }[] = [];
  const visit = (node: TipTapNode): void => {
    if (node.type === 'image') {
      const src = isRecord(node.attrs) && typeof node.attrs.src === 'string' ? node.attrs.src.trim() : '';
      if (src.startsWith('media:') && UUID_PATTERN.test(src.slice('media:'.length)) && isSafeMediaSrc(src)) {
        const alt = isRecord(node.attrs) && typeof node.attrs.alt === 'string' && node.attrs.alt.trim() !== '' ? node.attrs.alt.trim().slice(0, 300) : null;
        const title = isRecord(node.attrs) ? (node.attrs.title ?? node.attrs.caption) : undefined;
        const caption = typeof title === 'string' && title.trim() !== '' ? title.trim().slice(0, 500) : null;
        images.push({ mediaId: src.slice('media:'.length), alt, caption });
      }
      return;
    }
    for (const child of node.content ?? []) visit(child);
  };
  for (const child of doc.content ?? []) visit(child);
  return images;
}
