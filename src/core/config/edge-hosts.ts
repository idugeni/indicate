/** Edge-safe hostname defaults/parsing for `proxy.ts` + `next.config.ts`; full validation lives in `runtime-schema.ts`. */

const DEFAULT_DASHBOARD_HOST = 'indicate.web.id';
const DEFAULT_API_HOST = 'api.indicate.web.id';
const DEFAULT_WEBHOOK_HOST = 'webhook.indicate.web.id';
const DEFAULT_DOCS_HOST = 'docs.indicate.web.id';
const DEFAULT_PAGEVIEW_ENDPOINT = 'https://pv.indicate.web.id/v';

export interface ControlHosts {
  readonly dashboard: string;
  readonly api: string;
  readonly webhook: string;
  readonly docs: string;
}

export function getControlHosts(environment: NodeJS.ProcessEnv = process.env): ControlHosts {
  return Object.freeze({
    dashboard: (environment.DASHBOARD_HOST ?? DEFAULT_DASHBOARD_HOST).trim().toLowerCase(),
    api: (environment.API_HOST ?? DEFAULT_API_HOST).trim().toLowerCase(),
    webhook: (environment.WEBHOOK_HOST ?? DEFAULT_WEBHOOK_HOST).trim().toLowerCase(),
    docs: (environment.DOCS_HOST ?? DEFAULT_DOCS_HOST).trim().toLowerCase(),
  });
}

/**
 * Mengambil endpoint beacon pageview dengan default non-rahasia dalam kode.
 *
 * @param environment - Variabel lingkungan proses; klien memakai `NEXT_PUBLIC_` yang tersedia di browser.
 * @returns URL https absolut; fallback default bila kosong atau bukan https.
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
