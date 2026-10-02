export interface DocSectionItem {
  readonly heading: string;
  readonly body: string;
}

/**
 * Split one legal section body into rendered paragraphs.
 *
 * @param body - Section body; paragraphs separated by blank lines.
 * @returns Non-empty trimmed paragraphs, or the whole body when unbroken.
 */
export function splitLegalParagraphs(body: string): readonly string[] {
  const parts = body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts : [body];
}
