/**
 * Register, verify, and sitemap-submit Search Console Domain properties.
 *
 * A Domain property covers an apex and every region and city subdomain beneath
 * it, so one property per apex is enough for the whole tenant tree. The whole
 * flow is API-driven and needs no Search Console UI session:
 *
 * 1. `sites.add` registers `sc-domain:<host>` on the Search Console account.
 *   2. The Site Verification API issues a DNS token for the INET_DOMAIN.
 *   3. The token is written as a TXT record through the Cloudflare API.
 *   4. `webResource.insert` re-checks DNS and grants ownership; the property
 *      flips from `siteUnverifiedUser` to `siteOwner`.
 *   5. `sitemaps.submit` registers `/sitemap.xml` and `/news-sitemap.xml`.
 *
 * Google is the only writer of verification state, so every step is polled
 * rather than assumed. The script is idempotent: a host that already owns a
 * verified property and both sitemaps is skipped.
 *
 * @remarks The verification trigger is not in the published discovery
 * document. `webResource.insert` rejects a body carrying `verification_type`,
 * and rejects a body carrying `id`; the method is only reached as
 * `POST /webResource?verificationMethod=DNS_TXT` with a body of only
 * `site`. Without that call the property stays `siteUnverifiedUser` no matter
 * how long the TXT record is live, so this request is load-bearing rather than
 * a confirmation step.
 *
 * Usage:
 *   npm run gsc:verify -- --apply
 *   npm run gsc:verify -- --apply --only=artikulasi.biz.id
 *   npm run gsc:verify -- --host=example.com --apply
 *   npm run gsc:verify -- --apply --skip-sitemaps
 *
 * A property that is already `siteOwner` but has lost its TXT record is also
 * picked up: the record is reissued and rewritten, because Google re-checks DNS
 * and a verified property drops back to unverified when the record is gone.
 *
 * Options:
 *   --apply              Perform writes. Without it the script is a dry run and
 *                        prints the token and record it would have created.
 *   --only=a,b,c         Restrict to a comma-separated hostname allowlist.
 *   --host=<name>        Audit a hostname that is not a tenant apex, repeatable.
 *   --skip-sitemaps      Register properties but do not submit sitemaps.
 *   --wait=<minutes>     How long to wait for Google to flip the property to
 *                        siteOwner (default 30).
 *   --dry-run-verify     Skip propagation and verification polling.
 *
 * Environment: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`
 * (refresh token carrying the `webmasters` and `siteverification` scopes) and
 * `CLOUDFLARE_API_TOKEN` are read from `.env`. The refresh token must be able to
 * act for the account that owns the Search Console properties.
 *
 * Exits non-zero when any requested host fails to reach `siteOwner`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const WEBMASTERS = 'https://www.googleapis.com/webmasters/v3';
const SITE_VERIFICATION = 'https://www.googleapis.com/siteVerification/v1';
const CLOUDFLARE = 'https://api.cloudflare.com/client/v4';
const TXT_PREFIX = 'google-site-verification=';
const SITEMAPS = ['/sitemap.xml', '/news-sitemap.xml'];
const GOOGLE_DOH = 'https://dns.google/resolve';

const flags = new Map();
const extraHosts = [];
for (const argument of process.argv.slice(2)) {
  const [key, value] = argument.replace(/^--/u, '').split('=');
  if (key === 'host') {
    if (value !== undefined && value !== '') extraHosts.push(value.trim().toLowerCase());
    continue;
  }
  flags.set(key, value ?? true);
}
const shouldApply = flags.get('apply') === true;
const skipSitemaps = flags.get('skip-sitemaps') === true;
const dryRunVerify = flags.get('dry-run-verify') === true;
const waitMinutes = Number(flags.get('wait') ?? 30);
const only = String(flags.get('only') ?? '')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter((value) => value !== '');

function loadEnvFile(path) {
  let text = '';
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const raw = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/gu, '');
    if (process.env[key] === undefined) process.env[key] = raw;
  }
}
loadEnvFile(join(ROOT, '.env'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Perform a Google or Cloudflare request with retry on rate limiting.
 *
 * @param {string} url - Absolute request URL.
 * @param {RequestInit} init - Fetch options.
 * @param {object} options - Retry behaviour.
 * @param {number} options.attempts - Maximum tries before giving up.
 * @param {number} options.paceMs - Delay inserted after a success to stay
 * below the per-project low-rate quota both APIs enforce.
 * @returns {Promise<{ status: number, body: unknown, text: string }>} Decoded
 * response, or `{ status: 0 }` when every attempt failed.
 */
async function request(url, init, { attempts = 6, paceMs = 1500 } = {}) {
  let last = { status: 0, body: null, text: 'no attempt' };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) });
      const text = await res.text();
      let body = null;
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
      last = { status: res.status, body, text };
      if (res.status === 429 || res.status >= 500) {
        const wait = 15_000 * attempt;
        console.log(`      ${res.status} on ${shortUrl(url)}, retry ${attempt} in ${wait / 1000}s`);
        await sleep(wait);
        continue;
      }
      if (paceMs > 0) await sleep(paceMs);
      return last;
    } catch (error) {
      last = { status: 0, body: null, text: error instanceof Error ? error.message : String(error) };
      const wait = 10_000 * attempt;
      console.log(`      network error (${last.text}), retry ${attempt} in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
  return last;
}

function shortUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname.slice(0, 48)}`;
  } catch {
    return url.slice(0, 60);
  }
}

function apiError(res) {
  const message = res.body?.error?.message ?? res.text;
  return typeof message === 'string' ? message.replace(/\s+/gu, ' ').slice(0, 160) : 'unknown error';
}

async function googleAccessToken() {
  for (const key of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']) {
    if ((process.env[key] ?? '').trim() === '') {
      throw new Error(`${key} missing from .env; the refresh token needs the webmasters and siteverification scopes`);
    }
  }
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${JSON.stringify(body).slice(0, 200)}`);
  return body.access_token;
}

async function readApexes() {
  const poolUrl = (process.env.DATABASE_POOL_URL ?? '').trim();
  if (poolUrl === '') throw new Error('DATABASE_POOL_URL missing from .env');
  const sql = postgres(poolUrl, { prepare: false, connect_timeout: 10, idle_timeout: 5, max: 1 });
  try {
    const rows = await sql`
      SELECT hostname
      FROM indicate_private.list_public_network_sites()
      WHERE site_level = 'apex'
      ORDER BY hostname`;
    return rows.map((row) => String(row.hostname).toLowerCase().trim()).filter((hostname) => hostname !== '');
  } finally {
    await sql.end();
  }
}

async function readZoneIds() {
  const token = (process.env.CLOUDFLARE_API_TOKEN ?? '').trim();
  if (token === '') throw new Error('CLOUDFLARE_API_TOKEN missing from .env');
  const headers = { authorization: `Bearer ${token}` };
  const first = await (await fetch(`${CLOUDFLARE}/zones?per_page=50&page=1`, { headers })).json();
  if (first.success !== true) throw new Error(`cloudflare zone list failed: ${JSON.stringify(first.errors).slice(0, 200)}`);
  const totalPages = first.result_info?.total_pages ?? 1;
  const zones = [...first.result];
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await (await fetch(`${CLOUDFLARE}/zones?per_page=50&page=${page}`, { headers })).json();
    if (next.success === true) zones.push(...next.result);
  }
  return new Map(zones.map((zone) => [zone.name, { zoneId: zone.id, status: zone.status }]));
}

async function listProperties(auth) {
  const res = await request(`${WEBMASTERS}/sites`, { headers: auth });
  if (res.status !== 200) throw new Error(`sites.list failed: ${apiError(res)}`);
  const entries = res.body?.siteEntry ?? [];
  return new Map(entries.map((entry) => [entry.siteUrl.replace(/^sc-domain:/u, ''), entry.permissionLevel]));
}

async function addProperty(auth, host) {
  return request(`${WEBMASTERS}/sites/${encodeURIComponent(`sc-domain:${host}`)}`, { method: 'PUT', headers: auth, paceMs: 0 });
}

async function issueToken(auth, host) {
  const res = await request(`${SITE_VERIFICATION}/token`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ site: { identifier: host, type: 'INET_DOMAIN' }, verificationMethod: 'DNS' }),
    paceMs: 0,
  });
  if (res.status !== 200) return { ok: false, error: apiError(res), token: null };
  const raw = String(res.body?.token ?? '').trim();
  const token = raw.startsWith(TXT_PREFIX) ? raw : `${TXT_PREFIX}${raw}`;
  return { ok: true, error: null, token };
}

async function zoneRecords(headers, zoneId) {
  const res = await fetch(`${CLOUDFLARE}/zones/${zoneId}/dns_records?type=TXT&per_page=100`, { headers });
  if (!res.ok) return [];
  const body = await res.json();
  return Array.isArray(body.result) ? body.result : [];
}

async function upsertTxt(headers, zoneId, host, content) {
  const existing = (await zoneRecords(headers, zoneId)).filter((record) => record.content.startsWith(TXT_PREFIX));
  if (existing.length > 0) {
    const record = existing[0];
    if (record.content === content) return { action: 'unchanged', extra: existing.length - 1 };
    const res = await fetch(`${CLOUDFLARE}/zones/${zoneId}/dns_records/${record.id}`, {
      method: 'PUT',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'TXT', name: host, content, ttl: 3600, proxied: false }),
    });
    return { action: res.ok ? 'updated' : 'update-failed', extra: existing.length - 1, error: res.ok ? null : `HTTP ${res.status}` };
  }
  const res = await fetch(`${CLOUDFLARE}/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'TXT', name: host, content, ttl: 3600, proxied: false }),
  });
  return { action: res.ok ? 'created' : 'create-failed', extra: 0, error: res.ok ? null : `HTTP ${res.status}` };
}

async function publishedTxt(host) {
  const res = await fetch(`${GOOGLE_DOH}?name=${encodeURIComponent(host)}&type=TXT`, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  const body = await res.json();
  const answers = Array.isArray(body.Answer) ? body.Answer : [];
  return answers
    .filter((answer) => answer.type === 16 && typeof answer.data === 'string')
    .map((answer) => answer.data.replace(/^"|"$/gu, '').replace(/""/gu, '"'));
}

/**
 * Ask the Site Verification API to re-check DNS and claim ownership.
 *
 * @param {object} auth - Authorization header map.
 * @param {string} host - Apex hostname to verify.
 * @returns {Promise<{ ok: boolean, error: string | null }>} Whether Google
 * accepted the verification attempt.
 */
async function verifyDomain(auth, host) {
  const res = await request(`${SITE_VERIFICATION}/webResource?verificationMethod=DNS_TXT`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ site: { identifier: host, type: 'INET_DOMAIN' } }),
    paceMs: 0,
    attempts: 3,
  });
  return { ok: res.status === 200, error: res.status === 200 ? null : apiError(res) };
}

async function propertyLevel(auth, host) {
  const res = await request(`${WEBMASTERS}/sites/${encodeURIComponent(`sc-domain:${host}`)}`, { headers: auth, paceMs: 0, attempts: 3 });
  if (res.status !== 200) return null;
  return res.body?.permissionLevel ?? null;
}

async function listSitemaps(auth, host) {
  const res = await request(`${WEBMASTERS}/sites/${encodeURIComponent(`sc-domain:${host}`)}/sitemaps`, { headers: auth, paceMs: 0, attempts: 3 });
  if (res.status !== 200) return null;
  return (res.body?.sitemap ?? []).map((entry) => entry.path);
}

async function submitSitemap(auth, host, path) {
  const url = `https://${host}${path}`;
  const res = await request(`${WEBMASTERS}/sites/${encodeURIComponent(`sc-domain:${host}`)}/sitemaps/${encodeURIComponent(url)}`, { method: 'PUT', headers: auth, paceMs: 0, attempts: 3 });
  return { ok: res.status === 204, status: res.status, error: res.status === 204 ? null : apiError(res) };
}

const auth = { authorization: `Bearer ${await googleAccessToken()}` };
const cfHeaders = { authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` };
const apexes = await readApexes();
const zoneIds = await readZoneIds();
const levels = await listProperties(auth);

let targets = [...new Set([...apexes, ...extraHosts])];
if (only.length > 0) targets = targets.filter((host) => only.includes(host));

/**
 * Read the verification TXT state of every host that has a Cloudflare zone.
 *
 * @param {readonly string[]} hosts - Hostnames to inspect.
 * @returns {Promise<Map<string, { has: boolean, count: number }>>} State per host.
 */
async function scanTxt(hosts) {
  const state = new Map();
  let cursor = 0;
  const list = hosts.filter((host) => zoneIds.has(host));
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (cursor < list.length) {
      const host = list[cursor];
      cursor += 1;
      const found = (await zoneRecords(cfHeaders, zoneIds.get(host).zoneId)).filter((record) => record.content.startsWith(TXT_PREFIX));
      state.set(host, { has: found.length > 0, count: found.length });
    }
  }));
  return state;
}

const txtState = await scanTxt(targets);
const notOwner = targets.filter((host) => (levels.get(host) ?? null) !== 'siteOwner');
const missingTxt = targets.filter((host) => txtState.get(host)?.has !== true);
const work = [...new Set([...notOwner, ...missingTxt])];
const untouched = targets.length - work.length;
const backfillOnly = work.filter((host) => (levels.get(host) ?? null) === 'siteOwner' && !notOwner.includes(host));

console.log(`mode           : ${shouldApply ? 'APPLY (writes DNS and Search Console)' : 'dry run'}`);
console.log(`apex tenants   : ${apexes.length}`);
console.log(`hosts in scope : ${targets.length}`);
console.log(`complete       : ${untouched} (siteOwner and TXT present)`);
console.log(`to provision   : ${work.length}  (${notOwner.length} unverified, ${missingTxt.length} without TXT)`);
console.log(`  backfill only: ${backfillOnly.length} (already siteOwner, TXT missing)\n`);

const tokens = new Map(work.map((host) => [host, null]));
const zoneMissing = [];

if (work.length > 0) {
  console.log('== step 1/4 register property, issue token, write TXT ==');
  for (const host of work) {
    if ((levels.get(host) ?? null) === null) {
      const add = await addProperty(auth, host);
      console.log(`  ${add.status === 204 ? 'registered' : `register-failed(${add.status})`}  ${host}`);
    }
    const issued = await issueToken(auth, host);
    if (!issued.ok) {
      console.log(`  token-failed  ${host}  ${issued.error}`);
      continue;
    }
    tokens.set(host, issued.token);
    const zone = zoneIds.get(host);
    if (zone === undefined) {
      zoneMissing.push(host);
      console.log(`  no-zone       ${host}  token issued, Cloudflare has no zone for it`);
      continue;
    }
    if (!shouldApply) {
      console.log(`  would-write   ${host}  TXT ${issued.token.slice(0, 34)}...`);
      continue;
    }
    const result = await upsertTxt(cfHeaders, zone.zoneId, host, issued.token);
    const suffix = result.extra > 0 ? ` (+${result.extra} stale)` : '';
    console.log(`  txt-${result.action.padEnd(9)} ${host}${result.error === null || result.error === undefined ? suffix : `  ${result.error}`}`);
    await sleep(1200);
  }
  console.log('');
}

if (shouldApply && !dryRunVerify && work.length > 0) {
  console.log('== step 2/4 wait for DNS propagation ==');
  const deadline = Date.now() + 10 * 60 * 1000;
  const pending = new Set(work.filter((host) => tokens.get(host) !== null));
  while (pending.size > 0 && Date.now() < deadline) {
    const settled = [];
    for (const host of pending) {
      const txt = await publishedTxt(host);
      if (txt !== null && txt.includes(tokens.get(host))) settled.push(host);
    }
    for (const host of settled) pending.delete(host);
    console.log(`  visible ${work.length - pending.size}/${work.length}  (${pending.size} pending)`);
    if (pending.size === 0) break;
    await sleep(20_000);
  }
  for (const host of pending) console.log(`  NOT VISIBLE  ${host}`);
  console.log('');

  console.log(`== step 3/4 trigger verification, then wait for siteOwner (up to ${waitMinutes}m) ==`);
  const verifyDeadline = Date.now() + waitMinutes * 60 * 1000;
  const owners = new Set();
  let lastReport = 0;
  let triggered = false;
  while (Date.now() < verifyDeadline) {
    for (const host of work) {
      if (owners.has(host)) continue;
      const level = await propertyLevel(auth, host);
      if (level === 'siteOwner') owners.add(host);
    }
    if (!triggered) {
      for (const host of work) {
        if (owners.has(host) || zoneMissing.includes(host)) continue;
        const result = await verifyDomain(auth, host);
        console.log(`  verify-request ${result.ok ? 'accepted' : `rejected(${result.error})`}  ${host}`);
        await sleep(1500);
      }
      triggered = true;
    }
    if (owners.size !== lastReport) {
      lastReport = owners.size;
      console.log(`  siteOwner ${owners.size}/${work.length}`);
    }
    if (owners.size === work.length) break;
    await sleep(45_000);
  }
  for (const host of work) {
    if (owners.has(host)) continue;
    console.log(`  UNVERIFIED  ${host}  [${await propertyLevel(auth, host) ?? 'absent'}]`);
  }
  console.log('');

  if (!skipSitemaps) {
    const verifiedNow = new Set(await listProperties(auth).then((map) => [...map].filter(([, level]) => level === 'siteOwner').map(([host]) => host)));
    const sitemapTargets = targets.filter((host) => verifiedNow.has(host));
    console.log(`== step 4/4 submit sitemaps (${sitemapTargets.length} verified in scope) ==`);
    for (const host of sitemapTargets) {
      const current = await listSitemaps(auth, host);
      for (const path of SITEMAPS) {
        const url = `https://${host}${path}`;
        if (current !== null && current.includes(url)) {
          console.log(`  present      ${url}`);
          continue;
        }
        if (!shouldApply) {
          console.log(`  would-submit ${url}`);
          continue;
        }
        const result = await submitSitemap(auth, host, path);
        console.log(`  ${result.ok ? 'submitted' : `failed(${result.status})`}   ${url}${result.error === null ? '' : `  ${result.error}`}`);
      }
    }
    console.log('');
  }

  const failures = work.filter((host) => !owners.has(host));
  console.log(`== summary ==`);
  console.log(`verified as siteOwner: ${owners.size}/${work.length}`);
  console.log(`zone missing in CF    : ${zoneMissing.length}`);
  for (const host of failures) console.log(`  pending: ${host}`);
  process.exit(failures.length === 0 && zoneMissing.length === 0 ? 0 : 1);
} else {
  const issued = work.filter((host) => tokens.get(host) !== null).length;
  console.log(`== summary ==`);
  console.log(`tokens issued: ${issued}/${work.length}`);
  console.log(`zone missing : ${zoneMissing.length}`);
  for (const host of zoneMissing) console.log(`  no Cloudflare zone: ${host}`);
  console.log(shouldApply ? '' : '\nre-run with --apply to write the DNS records');
  process.exit(zoneMissing.length === 0 ? 0 : 1);
}
