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
 * Penerima beacon pageview pengganti worker tak berversi: `POST /v` menambah
 * satu counter Upstash, respons lain 404, kegagalan apa pun tetap 204 agar
 * beacon fire-and-forget tidak pernah memecah halaman. `content-type` sengaja
 * tidak diwajibkan karena `navigator.sendBeacon(string)` mengirim text/plain.
 * Bot terdeteksi (UA + sinyal `request.cf`) ditolak dengan 204 tanpa INCR.
 * Kunci counter diberi EXPIRE 7 hari agar tak menumpuk bila cron flush mati lama.
 */
const worker = {
  async fetch(request: Request, env: PageviewWorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v') {
      return new Response('Not Found', { status: 404 });
    }
    try {
      if (isBotPageview(request.headers.get('user-agent'), readCfHints(request))) {
        return new Response(null, { status: 204 });
      }
      const raw = await request.text();
      if (raw.length === 0 || raw.length > PAGEVIEW_BODY_MAX_BYTES) return new Response(null, { status: 204 });
      const parsed = pageviewBeaconSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return new Response(null, { status: 204 });
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
      /* hitungan boleh hilang */
    }
    return new Response(null, { status: 204 });
  },
};

export default worker;
