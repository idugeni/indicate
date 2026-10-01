import 'server-only';

/** Universal base for every Cloudflare AI Gateway endpoint. */
export const CLOUDFLARE_GATEWAY_BASE_URL = 'https://gateway.ai.cloudflare.com/v1';

/** Cache TTL applied when the caller configures a gateway without an explicit TTL. */
export const CLOUDFLARE_GATEWAY_DEFAULT_CACHE_TTL_SECONDS = 86400;

/** Upper bound accepted by the gateway; larger values are clamped, never rejected. */
export const CLOUDFLARE_GATEWAY_MAX_CACHE_TTL_SECONDS = 2592000;

/** Provider path carrying Google AI Studio traffic through one gateway. */
export const CLOUDFLARE_GATEWAY_GOOGLE_PATH = 'google-ai-studio';

/** Routing of one provider's traffic through a Cloudflare AI Gateway. */
export interface CloudflareGatewayConfig {
  readonly accountId: string;
  readonly gatewaySlug: string;
  readonly cacheTtlSeconds?: number | undefined;
  readonly skipCache?: boolean | undefined;
}

function clampCacheTtl(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return CLOUDFLARE_GATEWAY_DEFAULT_CACHE_TTL_SECONDS;
  return Math.min(Math.floor(value), CLOUDFLARE_GATEWAY_MAX_CACHE_TTL_SECONDS);
}

/**
 * Resolves gateway routing from assembled runtime values.
 *
 * @param input - Account id plus the optional gateway slug from bootstrap config.
 * @returns Gateway config, or null when no gateway slug is configured so callers stay direct.
 */
export function resolveCloudflareGatewayConfig(input: {
  readonly accountId?: string | null | undefined;
  readonly gatewaySlug?: string | null | undefined;
  readonly cacheTtlSeconds?: number | undefined;
  readonly skipCache?: boolean | undefined;
}): CloudflareGatewayConfig | null {
  const accountId = (input.accountId ?? '').trim();
  const gatewaySlug = (input.gatewaySlug ?? '').trim();
  if (accountId === '' || gatewaySlug === '') return null;
  return {
    accountId,
    gatewaySlug,
    ...(input.cacheTtlSeconds === undefined ? {} : { cacheTtlSeconds: clampCacheTtl(input.cacheTtlSeconds) }),
    ...(input.skipCache === undefined ? {} : { skipCache: input.skipCache }),
  };
}

/**
 * Builds the gateway base URL one provider SDK should target.
 *
 * @param config - Resolved gateway routing.
 * @param providerPath - Provider segment, e.g. `google-ai-studio` for Gemini traffic.
 * @returns Base URL carrying the account and gateway scope.
 */
export function buildCloudflareGatewayBaseUrl(config: CloudflareGatewayConfig, providerPath: string): string {
  const path = providerPath.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${CLOUDFLARE_GATEWAY_BASE_URL}/${config.accountId}/${config.gatewaySlug}${path === '' ? '' : `/${path}`}`;
}

/**
 * Builds the cache-control headers the gateway honors on every request.
 *
 * @param config - Resolved gateway routing.
 * @returns Headers merged into the provider request; empty when caching is skipped.
 */
export function buildCloudflareGatewayHeaders(config: CloudflareGatewayConfig): Record<string, string> {
  if (config.skipCache === true) return { 'cf-aig-skip-cache': 'true' };
  return { 'cf-aig-cache-ttl': String(clampCacheTtl(config.cacheTtlSeconds)) };
}
