/** Edge-safe hostname defaults/parsing for `proxy.ts` + `next.config.ts`; full validation lives in `runtime-schema.ts`. */

const DEFAULT_DASHBOARD_HOST = 'indicate.website';
const DEFAULT_API_HOST = 'api.indicate.website';
const DEFAULT_WEBHOOK_HOST = 'webhook.indicate.website';
const DEFAULT_PAGEVIEW_ENDPOINT = 'https://pv.indicate.website/v';

export interface ControlHosts {
  readonly dashboard: string;
  readonly api: string;
  readonly webhook: string;
}

export function getControlHosts(environment: NodeJS.ProcessEnv = process.env): ControlHosts {
  return Object.freeze({
    dashboard: (environment.DASHBOARD_HOST ?? DEFAULT_DASHBOARD_HOST).trim().toLowerCase(),
    api: (environment.API_HOST ?? DEFAULT_API_HOST).trim().toLowerCase(),
    webhook: (environment.WEBHOOK_HOST ?? DEFAULT_WEBHOOK_HOST).trim().toLowerCase(),
  });
}

/**
 * Resolve the pageview beacon endpoint with a non-secret in-code default.
 *
 * @param environment - Process environment variables; clients use the browser-available `NEXT_PUBLIC_` vars.
 * @returns Absolute https URL; default fallback when empty or not https.
 */
export function getPageviewEndpoint(environment: NodeJS.ProcessEnv = process.env): string {
  const raw = (environment.NEXT_PUBLIC_PAGEVIEW_ENDPOINT ?? '').trim();
  if (raw.toLowerCase().startsWith('https://')) return raw;
  return DEFAULT_PAGEVIEW_ENDPOINT;
}

export function parseMvpRootHosts(value: string | undefined): readonly string[] {
  if (value === undefined || value === '') return Object.freeze([]);
  return Object.freeze(
    value
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isProductionEdge(environment: Pick<NodeJS.ProcessEnv, 'NODE_ENV'> = process.env): boolean {
  return environment.NODE_ENV === 'production';
}
