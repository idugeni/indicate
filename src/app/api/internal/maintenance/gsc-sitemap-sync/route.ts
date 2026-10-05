import { NextResponse } from 'next/server';

import { getServerRuntimeContext } from '@/core/config/runtime/runtime-context';
import { readPublicNetworkSites } from '@/data/repos/content/queries';
import { getSharedRuntimeDatabase } from '@/data/client';
import { withApiAccess } from '@/core/observability/api-access';
import { authorized } from '@/app/api/internal/maintenance/view-flush/route';

const WEBMASTERS = 'https://www.googleapis.com/webmasters/v3';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export type SitemapSyncAction = 'submit' | 'delete' | 'none';

/**
 * Decide the Search Console submission for one sitemap URL.
 *
 * @param submitted - Whether the URL is currently submitted.
 * @param liveOk - Whether the live feed answers 200 with entries.
 * @returns Submit when missing but live, delete when submitted but dry, else none.
 */
export function planSitemapSync(submitted: boolean, liveOk: boolean): SitemapSyncAction {
  if (liveOk && !submitted) return 'submit';
  if (!liveOk && submitted) return 'delete';
  return 'none';
}

async function googleAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { access_token?: unknown };
    return typeof body.access_token === 'string' ? body.access_token : null;
  } catch {
    return null;
  }
}

async function feedHasUrls(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return false;
    return (await res.text()).includes('<url>');
  } catch {
    return false;
  }
}

async function listSubmitted(token: string, host: string): Promise<string[] | null> {
  try {
    const res = await fetch(`${WEBMASTERS}/sites/${encodeURIComponent(`sc-domain:${host}`)}/sitemaps`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { sitemap?: Array<{ path?: unknown }> };
    if (!Array.isArray(body.sitemap)) return [];
    return body.sitemap.filter((entry) => typeof entry.path === 'string').map((entry) => entry.path as string);
  } catch {
    return null;
  }
}

async function mutateSubmission(token: string, host: string, url: string, method: 'PUT' | 'DELETE'): Promise<boolean> {
  try {
    const res = await fetch(
      `${WEBMASTERS}/sites/${encodeURIComponent(`sc-domain:${host}`)}/sitemaps/${encodeURIComponent(url)}`,
      { method, headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) },
    );
    return res.status === 204 || (method === 'DELETE' && res.status === 404);
  } catch {
    return false;
  }
}

async function handleGET(request: Request) {
  const context = await getServerRuntimeContext();
  if (!authorized(request, context.config.security.cronSecret)) {
    return new NextResponse('Not Found', { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const noStore = { 'Cache-Control': 'private, no-store' };
  const clientId = context.bootstrap.credentials.googleClientId;
  const clientSecret = context.bootstrap.credentials.googleClientSecret?.reveal() ?? null;
  const refreshToken = context.bootstrap.credentials.googleRefreshToken?.reveal() ?? null;
  if (clientId === null || clientSecret === null || refreshToken === null) {
    return NextResponse.json({ ok: false, reason: 'google-credentials-absent' }, { status: 503, headers: noStore });
  }
  const token = await googleAccessToken(clientId, clientSecret, refreshToken);
  if (token === null) {
    return NextResponse.json({ ok: false, reason: 'google-token-exchange-failed' }, { status: 503, headers: noStore });
  }
  const runtime = getSharedRuntimeDatabase(context.bootstrap);
  const sites = await readPublicNetworkSites(runtime.db);
  const apexes = sites.filter((site) => site.siteLevel === 'apex').map((site) => site.hostname);

  let submitted = 0;
  let deleted = 0;
  const failed: string[] = [];
  for (const host of apexes) {
    const current = await listSubmitted(token, host);
    if (current === null) {
      failed.push(host);
      continue;
    }
    const targets = [`https://${host}/sitemap.xml`, `https://${host}/news-sitemap.xml`];
    for (const url of targets) {
      const action = planSitemapSync(current.includes(url), await feedHasUrls(url));
      if (action === 'none') continue;
      const ok = await mutateSubmission(token, host, url, action === 'submit' ? 'PUT' : 'DELETE');
      if (ok) {
        if (action === 'submit') submitted += 1;
        else deleted += 1;
      } else {
        failed.push(`${host} ${url}`);
      }
    }
  }
  return NextResponse.json(
    { ok: failed.length === 0, checked: apexes.length, submitted, deleted, failed },
    { status: failed.length === 0 ? 200 : 207, headers: noStore },
  );
}

/**
 * Sinkronisasi submission sitemap Search Console harian.
 *
 * @remarks Submit sitemap yang live tapi belum terdaftar, unsubmit news
 * sitemap yang kosong agar Search Console tidak melaporkan error. Tanpa
 * kredensial Google API menjawab 503 agar cron tahu dependensi belum siap.
 */
export const GET = withApiAccess('GET /api/internal/maintenance/gsc-sitemap-sync', handleGET);
