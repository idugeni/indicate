import { isRecord, isTipTapDoc, TIPTAP_MAX_TEXT_LENGTH, type TipTapNode } from '@/modules/site/tiptap-document/types';

function nodeText(node: TipTapNode, parts: string[]): void {
  if (node.type === 'text') {
    if (typeof node.text === 'string') parts.push(node.text);
    return;
  }
  if (node.type === 'image' || node.type === 'youtube' || node.type === 'video' || node.type === 'twitter' || node.type === 'instagram' || node.type === 'tiktok' || node.type === 'facebook' || node.type === 'drive' || node.type === 'horizontalRule' || node.type === 'hardBreak') return;
  for (const child of node.content ?? []) nodeText(child, parts);
}

/**
 * Reduce a TipTap document to plain text for excerpts, search, and SEO.
 *
 * @param doc - Validated or untrusted TipTap JSON; invalid input yields an empty string.
 * @returns Single-line plain text without markup, media, or embeds.
 */
export function tiptapToText(doc: unknown): string {
  if (!isTipTapDoc(doc)) return '';
  const parts: string[] = [];
  for (const child of doc.content ?? []) {
    const before = parts.length;
    nodeText(child, parts);
    if (parts.length > before) parts.push(' ');
  }
  return parts.join('').replace(/\s+/gu, ' ').trim();
}

function blockToLegacyLines(node: TipTapNode, lines: string[]): void {
  if (node.type === 'heading') {
    const level = isRecord(node.attrs) && (node.attrs.level === 3 || node.attrs.level === 4) ? '###' : '##';
    const parts: string[] = [];
    for (const child of node.content ?? []) nodeText(child, parts);
    const text = parts.join('').replace(/\s+/gu, ' ').trim();
    if (text !== '') lines.push(`${level} ${text}`);
    return;
  }
  if (node.type === 'blockquote') {
    const parts: string[] = [];
    for (const child of node.content ?? []) nodeText(child, parts);
    const text = parts.join(' ').replace(/\s+/gu, ' ').trim();
    if (text !== '') lines.push(`> ${text}`);
    return;
  }
  if (node.type === 'bulletList' || node.type === 'orderedList') {
    for (const child of node.content ?? []) {
      if (child.type !== 'listItem') continue;
      const parts: string[] = [];
      for (const grand of child.content ?? []) {
        if (grand.type === 'paragraph' || grand.type === 'text') nodeText(grand, parts);
        else blockToLegacyLines(grand, lines);
      }
      const text = parts.join('').replace(/\s+/gu, ' ').trim();
      if (text !== '') lines.push(`- ${text}`);
    }
    return;
  }
  if (node.type === 'codeBlock') {
    const parts: string[] = [];
    for (const child of node.content ?? []) nodeText(child, parts);
    const text = parts.join('').trim();
    if (text !== '') lines.push(text);
    return;
  }
  const parts: string[] = [];
  nodeText(node, parts);
  const text = parts.join('').replace(/\s+/gu, ' ').trim();
  if (text !== '') lines.push(text);
}

/**
 * Derive the legacy plain-text body column from a TipTap document.
 *
 * @param doc - Validated or untrusted TipTap JSON.
 * @returns Paragraph text joined by blank lines; empty string for invalid docs.
 */
export function tiptapToLegacyBody(doc: unknown): string {
  if (!isTipTapDoc(doc)) return '';
  const lines: string[] = [];
  for (const child of doc.content ?? []) blockToLegacyLines(child, lines);
  return lines.join('\n\n').slice(0, TIPTAP_MAX_TEXT_LENGTH);
}
