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
const nonEmptyStringField = { type: 'STRING', 'x-minLength': 1 } as const;
const boundedStringArrayField = (minItems: number, maxItems: number) => ({ type: 'ARRAY', items: nonEmptyStringField, minItems, maxItems });
const stringArrayField = { type: 'ARRAY', items: stringField } as const;

function objectSchema(
  properties: Record<string, unknown>,
  required: readonly string[],
): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties,
    required: [...new Set([...required, ...Object.keys(properties)])],
    additionalProperties: false,
  };
}

/**
 * Article draft shape read by `parseArticleDraft`.
 *
 * @returns Schema requiring the title and content keys.
 */
export const ARTICLE_DRAFT_SCHEMA: Record<string, unknown> = objectSchema(
  {
    title: nonEmptyStringField,
    excerpt: { type: 'STRING', 'x-minLength': 1, 'x-maxLength': 400 },
    content: nonEmptyStringField,
    slug_suggestion: nonEmptyStringField,
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
    tags: boundedStringArrayField(5, 8),
    category: nonEmptyStringField,
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
    summary: nonEmptyStringField,
    suggested_priority: { type: 'STRING', enum: ['low', 'normal', 'high', 'urgent'] },
    risk_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi', 'kritis'] },
    keywords: stringArrayField,
    recommendation: nonEmptyStringField,
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
    alt: nonEmptyStringField,
    caption: nonEmptyStringField,
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
    title: nonEmptyStringField,
    slug: nonEmptyStringField,
    excerpt: stringField,
    content: nonEmptyStringField,
    tags: stringArrayField,
    suggestedCategory: stringField,
    alt: nonEmptyStringField,
    caption: nonEmptyStringField,
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
    titles: boundedStringArrayField(3, 3),
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
    meta_description: { type: 'STRING', 'x-minLength': 150, 'x-maxLength': 160 },
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
    excerpt: { type: 'STRING', 'x-minLength': 1, 'x-maxLength': 400 },
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
    titles: boundedStringArrayField(3, 3),
    excerpt: { type: 'STRING', 'x-minLength': 1, 'x-maxLength': 400 },
    meta_description: { type: 'STRING', 'x-minLength': 150, 'x-maxLength': 160 },
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
    body: nonEmptyStringField,
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
    transcript: nonEmptyStringField,
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
    summary: nonEmptyStringField,
    risk_level: { type: 'STRING', enum: ['rendah', 'sedang', 'tinggi'] },
    checklist: stringArrayField,
    recommendation: nonEmptyStringField,
  },
  ['summary'],
);

/** Plain-language moderation reply inside a strict JSON envelope. */
export const MODERATION_REPLY_SCHEMA: Record<string, unknown> = objectSchema(
  { draft: nonEmptyStringField },
  ['draft'],
);

/** Dashboard narrative inside a strict JSON envelope. */
export const INSIGHT_NARRATIVE_SCHEMA: Record<string, unknown> = objectSchema(
  { narrative: nonEmptyStringField },
  ['narrative'],
);

/** Staff assistant reply inside a strict JSON envelope; `reply` itself remains plain text. */
export const ASSISTANT_REPLY_SCHEMA: Record<string, unknown> = objectSchema(
  { reply: nonEmptyStringField },
  ['reply'],
);

/** Remove application-only validation extensions before forwarding a schema to a provider. */

/** Strict top-level plan envelope for the dashboard's actor-filtered tool registry. */
export function createAiOperatorToolPlanSchema(toolIds: readonly string[]): Record<string, unknown> {
  const step = objectSchema({
    toolId: { type: 'STRING', enum: [...toolIds] },
    input: { type: 'STRING', 'x-minLength': 2, 'x-maxLength': 16000 },
    rationale: { type: 'STRING', 'x-minLength': 1, 'x-maxLength': 500 },
  }, ['toolId', 'input', 'rationale']);
  return objectSchema({
    kind: { type: 'STRING', enum: ['plan', 'clarification'] },
    summary: { type: 'STRING', 'x-maxLength': 1000 },
    question: { type: 'STRING', 'x-maxLength': 1000 },
    steps: { type: 'ARRAY', items: step, maxItems: 8 },
  }, ['kind', 'summary', 'question', 'steps']);
}

/** Strict read-capability planning contract; capability input is validated by its own strict Zod schema. */
export function createReadOperatorPlanSchema(capabilityIds: readonly string[]): Record<string, unknown> {
  const step = objectSchema({
    id: { type: 'STRING', 'x-minLength': 1, 'x-maxLength': 64 },
    capabilityId: { type: 'STRING', enum: [...capabilityIds] },
    arguments: { type: 'STRING', 'x-minLength': 2, 'x-maxLength': 8000 },
  }, ['id', 'capabilityId', 'arguments']);
  return objectSchema({
    steps: { type: 'ARRAY', items: step, maxItems: 8 },
  }, ['steps']);
}

export function toProviderResponseSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith('x-')) continue;
    if (key === 'properties' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out[key] = Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, child]) => [
        name, typeof child === 'object' && child !== null && !Array.isArray(child)
          ? toProviderResponseSchema(child as Record<string, unknown>) : child,
      ]));
    } else if (key === 'items' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out[key] = toProviderResponseSchema(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
