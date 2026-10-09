import 'server-only';

/** Fixed Vercel AI Gateway model for editorial SEO metadata and taxonomy suggestions. */
export const SEO_METADATA_MODEL = 'google/gemini-3.5-flash-lite';

/** Pin the Gateway to Google AI Studio; no cross-provider failover is allowed for SEO tasks. */
export const SEO_METADATA_GATEWAY_PROVIDER = 'google';
