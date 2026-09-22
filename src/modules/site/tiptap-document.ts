export interface TipTapTextMark {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
}

export interface TipTapNode {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>>;
  readonly content?: readonly TipTapNode[];
  readonly text?: string;
  readonly marks?: readonly TipTapTextMark[];
}

export interface TipTapDoc {
  readonly type: 'doc';
  readonly content?: readonly TipTapNode[];
}

export const TIPTAP_MAX_NODES = 500;
export const TIPTAP_MAX_TEXT_LENGTH = 200_000;
export const TIPTAP_MAX_DEPTH = 12;
export const TIPTAP_MAX_URL_LENGTH = 2000;
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'heading',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'text',
  'image',
  'youtube',
  'video',
]);

const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'code', 'underline', 'link']);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/u, '');
  if (host === 'localhost' || host === '::1' || host === '[::1]' || host === '0.0.0.0') return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.test') || host.endsWith('.example')) return true;
  if (/^127\./u.test(host)) return true;
  if (/^10\./u.test(host)) return true;
  if (/^192\.168\./u.test(host)) return true;
  const private172 = /^172\.(1[6-9]|2[0-9]|3[0-1])\./u;
  if (private172.test(host)) return true;
  if (host.startsWith('[')) return host === '[::1]' || host.startsWith('[fe80:') || host.startsWith('[fc00:') || host.startsWith('[fd00:');
  return false;
}

/**
 * Validate an absolute http(s) URL against safe protocols and public hosts.
 *
 * @param value - Candidate URL string.
 * @returns True for absolute http/https URLs without credentials on non-private hosts.
 */
export function isSafeHttpUrl(value: string): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH) return false;
  if (/[\s<>"\\]/u.test(trimmed)) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.username !== '' || parsed.password !== '') return false;
  if (parsed.hostname === '') return false;
  if (isPrivateHostname(parsed.hostname)) return false;
  return true;
}

/**
 * Validate an editorial link target: relative site paths or safe http(s) URLs.
 *
 * @param value - Candidate href from TipTap content.
 * @returns True when the href is a safe in-site path or public http(s) URL.
 */
export function isSafeLinkUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH) return false;
  if (/[\s<>"\\]/u.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) return false;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false;
    return true;
  }
  if (/^[a-z][a-z0-9+.-]*:/iu.test(trimmed)) return isSafeHttpUrl(trimmed);
  return false;
}

/**
 * Validate an inline media source: durable media refs, site-relative paths, or https URLs.
 *
 * @param value - Candidate image `src` from TipTap content.
 * @returns True for `media:<uuid>`, safe site-relative paths, or public https URLs.
 */
export function isSafeMediaSrc(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > TIPTAP_MAX_URL_LENGTH) return false;
  if (/[\s<>"\\]/u.test(trimmed)) return false;
  if (trimmed.startsWith('media:')) return UUID_PATTERN.test(trimmed.slice('media:'.length));
  if (trimmed.startsWith('r2:')) return trimmed.length > 3;
  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//')) return false;
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('blob:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username !== '' || parsed.password !== '') return false;
    if (parsed.hostname === '' || isPrivateHostname(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve a durable media reference to a site-relative public URL.
 *
 * @param src - Stored image source (`media:<uuid>` or a URL/path).
 * @returns Site-relative media URL for `media:` refs; the input otherwise.
 */
export function resolveMediaSrc(src: string): string {
  const trimmed = src.trim();
  if (trimmed.startsWith('media:')) {
    const id = trimmed.slice('media:'.length);
    if (UUID_PATTERN.test(id)) return `/api/network/media/${id}`;
  }
  return trimmed;
}

/**
 * Extract a YouTube video ID from embed, watch, share, or raw-ID inputs.
 *
 * @param value - Candidate video reference from TipTap content.
 * @returns 11-character video ID, or null when the input is not a YouTube reference.
 */
export function extractYouTubeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./u, '');
  const idFromParam = parsed.searchParams.get('v');
  if ((host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com' || host === 'www.youtube-nocookie.com') && idFromParam !== null && YOUTUBE_ID_PATTERN.test(idFromParam)) return idFromParam;
  if (host === 'youtu.be') {
    const candidate = parsed.pathname.replace(/^\//u, '').split('/')[0] ?? '';
    if (YOUTUBE_ID_PATTERN.test(candidate)) return candidate;
  }
  const segments = parsed.pathname.split('/').filter((segment) => segment !== '');
  const embedIndex = segments.findIndex((segment) => segment === 'embed' || segment === 'shorts' || segment === 'live');
  if (embedIndex >= 0) {
    const candidate = segments[embedIndex + 1] ?? '';
    if (YOUTUBE_ID_PATTERN.test(candidate)) return candidate;
  }
  return null;
}

/**
 * Check whether an unknown value has the minimal TipTap document shape.
 *
 * @param value - Candidate parsed JSON.
 * @returns True when the value is a `{ type: 'doc' }` object.
 */
export function isTipTapDoc(value: unknown): value is TipTapDoc {
  if (!isRecord(value)) return false;
  if (value.type !== 'doc') return false;
  if (value.content === undefined) return true;
  return Array.isArray(value.content);
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
      }
      return null;
    }
    if (node.type === 'heading') {
      const level = isRecord(node.attrs) ? node.attrs.level : undefined;
      if (level !== 1 && level !== 2 && level !== 3 && level !== 4 && level !== 5 && level !== 6) return 'invalid-heading-level';
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
  return { ok: true, doc: { type: 'doc', content } };
}

function nodeText(node: TipTapNode, parts: string[]): void {
  if (node.type === 'text') {
    if (typeof node.text === 'string') parts.push(node.text);
    return;
  }
  if (node.type === 'image' || node.type === 'youtube' || node.type === 'video' || node.type === 'horizontalRule' || node.type === 'hardBreak') return;
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
