import {
  buildPageviewKey,
  isBotPageview,
  PAGEVIEW_BODY_MAX_BYTES,
  PAGEVIEW_KEY_TTL_SECONDS,
  pageviewBeaconSchema,
  type PageviewCfHints,
} from '../../../src/modules/site/pageview-contract';

interface PageviewWorkerEnv {
  readonly ENVIRONMENT?: string;
  readonly UPSTASH_REDIS_REST_URL: string;
  readonly UPSTASH_REDIS_REST_TOKEN: string;
}

interface WorkerCfBotManagement {
  readonly verifiedBot?: boolean | undefined;
  readonly score?: number | undefined;
}

interface WorkerCf {
  readonly botManagement?: WorkerCfBotManagement | undefined;
  readonly threatScore?: number | undefined;
}

function readCfHints(request: Request): PageviewCfHints | null {
  try {
    const cf = (request as Request & { readonly cf?: WorkerCf | undefined }).cf;
    if (cf === undefined) return null;
    return {
      verifiedBot: cf.botManagement?.verifiedBot,
      botScore: cf.botManagement?.score,
      threatScore: cf.threatScore,
    };
  } catch {
    return null;
  }
}

/**
 * Pageview beacon receiver replacing the unversioned worker: `POST /v` increments
 * one Upstash counter, other responses 404, any failure still 204 so the
 * fire-and-forget beacon never breaks the page. `content-type` is deliberately
 * not required because `navigator.sendBeacon(string)` sends text/plain.
 * Detected bots (UA + `request.cf` signals) are rejected with 204 without INCR.
 * The counter key gets a 7-day EXPIRE so keys do not pile up when the flush cron stays down long.
 * Loose CORS (`*`) + `OPTIONS → 204` so future JSON payloads that trigger
 * preflight do not fail silently; the beacon never reads the response, so
 * opening the origin does not weaken the limits (UUID + 1 KB validation still apply).
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
} as const;

const worker = {
  async fetch(request: Request, env: PageviewWorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname === '/v') {
      return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
    }
    if (request.method !== 'POST' || url.pathname !== '/v') {
      return new Response('Not Found', { status: 404, headers: { ...CORS_HEADERS } });
    }
    try {
      if (isBotPageview(request.headers.get('user-agent'), readCfHints(request))) {
        return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
      }
      const raw = await request.text();
      if (raw.length === 0 || raw.length > PAGEVIEW_BODY_MAX_BYTES) return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
      const parsed = pageviewBeaconSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
      const key = buildPageviewKey(env.ENVIRONMENT ?? 'production', parsed.data);
      const upstream = await fetch(`${env.UPSTASH_REDIS_REST_URL}/pipeline`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, PAGEVIEW_KEY_TTL_SECONDS],
        ]),
      });
      await upstream.arrayBuffer();
    } catch {
      /* counts may be lost */
    }
    return new Response(null, { status: 204, headers: { ...CORS_HEADERS } });
  },
};

export default worker;
