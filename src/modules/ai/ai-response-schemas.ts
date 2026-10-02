/**
 * Structured-output schemas for Gemini JSON mode.
 *
 * @remarks Every dashboard prompt that sets `responseMimeType:
 * 'application/json'` must send the matching schema below. The provider
 * only guarantees parseable output when mime type and schema travel
 * together; mime type alone is best-effort and lets prose slip through,
 * which the strict parsers reject as a busy error with no provider
 * signal in the audit log. Keys and required lists mirror exactly what
 * each `parse*` function reads, so a schema-valid response always parses.
 */
const stringField = { type: 'STRING' } as const;

const stringArrayField = { type: 'ARRAY', items: { type: 'STRING' } } as const;

function objectSchema(
  properties: Record<string, unknown>,
  required: readonly string[],
): Record<string, unknown> {
  return { type: 'OBJECT', properties, required: [...required] };
}

/**
 * Article draft shape read by `parseArticleDraft`.
 *
 * @returns Schema requiring the title and content keys.
 */
export const ARTICLE_DRAFT_SCHEMA: Record<string, unknown> = objectSchema(
  {
    title: stringField,
    excerpt: stringField,
    content: stringField,
    slug_suggestion: stringField,
  },
  ['title', 'content'],
);

/**
 * Tag suggestion shape read by `parseTagSuggestion`.
 *
 * @returns Schema requiring both keys; empty values stay parseable.
 */
export const TAG_SUGGESTION_SCHEMA: Record<string, unknown> = objectSchema(
  {
    tags: stringArrayField,
    category: stringField,
  },
  ['tags', 'category'],
);

/**
 * Moderation analysis shape read by `parseModerationAnalysis`.
 *
 * @returns Schema requiring the summary key with enums for the pick fields.
 */
export const MODERATION_ANALYSIS_SCHEMA: Record<string, unknown> = objectSchema(
  {
    summary: stringField,
    suggested_priority: { type: 'STRING', enum: ['low', 'normal', 'high', 'urgent'] },
    risk_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi', 'kritis'] },
    keywords: stringArrayField,
    recommendation: stringField,
  },
  ['summary'],
);

/**
 * Cover caption shape read by `parseCoverCaption`.
 *
 * @returns Schema requiring both keys; the parser only fails when both are empty.
 */
export const COVER_CAPTION_SCHEMA: Record<string, unknown> = objectSchema(
  {
    alt: stringField,
    caption: stringField,
  },
  ['alt', 'caption'],
);

/**
 * Vision draft shape read by `parseVisionDraft`.
 *
 * @returns Schema requiring the title and content keys.
 */
export const VISION_DRAFT_SCHEMA: Record<string, unknown> = objectSchema(
  {
    title: stringField,
    slug: stringField,
    excerpt: stringField,
    content: stringField,
    tags: stringArrayField,
    suggestedCategory: stringField,
    alt: stringField,
    caption: stringField,
  },
  ['title', 'content'],
);

/**
 * Title suggestion shape read by `parseTitleSuggestions`.
 *
 * @returns Schema requiring the titles array.
 */
export const SEO_TITLES_SCHEMA: Record<string, unknown> = objectSchema(
  {
    titles: stringArrayField,
  },
  ['titles'],
);

/**
 * Meta description shape read by `parseMetaDescription`.
 *
 * @returns Schema requiring the meta_description key.
 */
export const SEO_META_SCHEMA: Record<string, unknown> = objectSchema(
  {
    meta_description: stringField,
  },
  ['meta_description'],
);

/**
 * Excerpt shape read by `parseExcerptSuggestion`.
 *
 * @returns Schema requiring the excerpt key.
 */
export const SEO_EXCERPT_SCHEMA: Record<string, unknown> = objectSchema(
  {
    excerpt: stringField,
  },
  ['excerpt'],
);

/**
 * Combined SEO bundle shape read by `parseSeoBundle`.
 *
 * @returns Schema requiring all three bundle keys.
 */
export const SEO_BUNDLE_SCHEMA: Record<string, unknown> = objectSchema(
  {
    titles: stringArrayField,
    excerpt: stringField,
    meta_description: stringField,
  },
  ['titles', 'excerpt', 'meta_description'],
);

/**
 * Polished body shape read by `parsePolishedBody`.
 *
 * @returns Schema requiring the body key.
 */
export const POLISH_BODY_SCHEMA: Record<string, unknown> = objectSchema(
  {
    body: stringField,
  },
  ['body'],
);

/**
 * Classification shape read by `parseClassification`.
 *
 * @returns Schema requiring both array keys.
 */
export const CLASSIFY_ARTICLE_SCHEMA: Record<string, unknown> = objectSchema(
  {
    categories: stringArrayField,
    tags: stringArrayField,
  },
  ['categories', 'tags'],
);

/**
 * Transcript shape read by `parseTranscript`.
 *
 * @returns Schema requiring the transcript key.
 */
export const TRANSCRIPT_SCHEMA: Record<string, unknown> = objectSchema(
  {
    transcript: stringField,
  },
  ['transcript'],
);

/**
 * Publisher verification shape read by `parseVerification`.
 *
 * @returns Schema requiring the summary key with the risk enum.
 */
export const PUBLISHER_VERIFY_SCHEMA: Record<string, unknown> = objectSchema(
  {
    summary: stringField,
    risk_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi'] },
    checklist: stringArrayField,
    recommendation: stringField,
  },
  ['summary'],
);
