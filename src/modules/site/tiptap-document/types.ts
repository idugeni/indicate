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

export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export const ALLOWED_NODES = new Set([
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
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
  'text',
  'image',
  'youtube',
  'video',
  'twitter',
  'instagram',
  'tiktok',
  'facebook',
  'drive',
]);

export const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'code', 'underline', 'link', 'highlight', 'textStyle']);

export const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu;
export const TEXT_ALIGN_VALUES = new Set(['left', 'center', 'right', 'justify']);
export const TABLE_MAX_ROWS = 30;
export const TABLE_MAX_COLS = 12;

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
