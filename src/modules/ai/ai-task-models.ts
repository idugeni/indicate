import 'server-only';

/** Lowest-cost selected text-output model for text generation and multimodal-input/text-output tasks. */
export const LOW_COST_TEXT_MODEL = 'google/gemini-2.5-flash-lite';

/** Pin Vercel AI Gateway routing to its Google provider; no other provider may receive these requests. */
export const LOW_COST_TEXT_GATEWAY_PROVIDER = 'google';

/** Backward-compatible name used by existing SEO call sites. */
export const SEO_METADATA_MODEL = LOW_COST_TEXT_MODEL;
export const SEO_METADATA_GATEWAY_PROVIDER = LOW_COST_TEXT_GATEWAY_PROVIDER;
