/**
 * Read-only Search Console ownership audit for every apex tenant hostname.
 *
 * Google verifies a Domain property through a `google-site-verification` TXT
 * record at the domain root, and one apex property covers its whole region and
 * city tree because those are subdomains of the apex. The HTML-tag alternative
 * (`GOOGLE_SITE_VERIFICATION`) can only ever prove a single control-plane
 * property, so DNS TXT is the only mechanism that scales across the network.
 *
 * Reads the apex list from Postgres, resolves TXT over DNS-over-HTTPS, and
 * reports which apexes still lack the record. Never writes to DNS or Postgres.
 *
 * Usage:
 *   node scripts/gsc-verification-audit.mjs
 *   node scripts/gsc-verification-audit.mjs --verify
 *   node scripts/gsc-verification-audit.mjs --tokens=tmp/gsc-tokens.json
 *   node scripts/gsc-verification-audit.mjs --json --concurrency=16
 *
 * Options:
 *   --verify         Exit non-zero while any apex is unverified (CI gate).
 *   --json           Emit a JSON report instead of the text table.
 *   --tokens=<file>  JSON object of hostname to GSC token. When the token for
 *                    a missing apex is present, print the exact DNS record.
 *   --host=<name>    Extra hostname to audit, repeatable. When no --host is
 *                    given, the control plane is added from `DASHBOARD_HOST`,
 *                    falling back to the host of `NEXT_PUBLIC_SITE_URL`.
 *   --concurrency=N  Parallel DNS lookups (default 8).
 *
 * Environment: reads `DATABASE_POOL_URL`, `DASHBOARD_HOST`, and
 * `NEXT_PUBLIC_SITE_URL` from `.env`.
 */
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GOOGLE_DOH = 'https://dns.google/resolve';
const CLOUDFLARE_DOH = 'https://cloudflare-dns.com/dns-query';
const TOKEN_PREFIX = 'google-site-verification=';
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{8,128}$/u;
const DNS_STATUS = { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 4: 'NOTIMP', 5: 'REFUSED' };

const flags = new Map();
const repeated = new Map();
for (const argument of process.argv.slice(2)) {
  const [key, value] = argument.replace(/^--/u, '').split('=');
  if (key === 'host') {
    repeated.set('host', [...(repeated.get('host') ?? []), (value ?? '').trim()]);
    continue;
  }
  flags.set(key, value ?? true);
}
const asNumber = (key, fallback) => {
  const raw = Number(flags.get(key));
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
};
const concurrency = asNumber('concurrency', 8);
const asJson = flags.get('json') === true;
const verifyOnly = flags.get('verify') === true;

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

async function readTokens(path) {
  if (path === undefined) return { tokens: new Map(), rejected: [] };
  let parsed;
  try {
    parsed = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`--tokens file unreadable: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('--tokens file must be a JSON object of hostname to token');
  }
  return Object.entries(parsed).reduce(
    (acc, [hostname, token]) => {
      const key = hostname.toLowerCase().trim();
      const value = String(token).trim().replace(new RegExp(`^${TOKEN_PREFIX}`, 'u'), '');
      if (TOKEN_SHAPE.test(value)) acc.tokens.set(key, value);
      else acc.rejected.push({ hostname: key, token: value });
      return acc;
    },
    { tokens: new Map(), rejected: [] },
  );
}

async function readApexes() {
  const poolUrl = process.env.DATABASE_POOL_URL;
  if (poolUrl === undefined || poolUrl === '') throw new Error('DATABASE_POOL_URL missing from .env');
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

/**
 * Resolve the TXT records of one hostname over DNS-over-HTTPS.
 *
 * @param {string} hostname - FQDN to query, no trailing dot.
 * @param {'google' | 'cloudflare'} resolver - Which public DoH endpoint to ask.
 * @returns {Promise<{ txt: string[], status: number }>} Joined TXT strings and
 * the DNS response status (`NOERROR` becomes 0).
 */
async function resolveTxt(hostname, resolver) {
  const endpoint = resolver === 'cloudflare' ? CLOUDFLARE_DOH : GOOGLE_DOH;
  const response = await fetch(`${endpoint}?name=${encodeURIComponent(hostname)}&type=TXT`, {
    headers: { accept: 'application/dns-json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`DoH HTTP ${response.status}`);
  const payload = await response.json();
  const answer = Array.isArray(payload.Answer) ? payload.Answer : [];
  const txt = answer
    .filter((record) => record.type === 16 && typeof record.data === 'string')
    .map((record) => record.data.replace(/^"|"$/gu, '').replace(/""/gu, '"'));
  return { txt, status: Number(payload.Status) };
}

async function mapLimited(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

async function auditHostname(hostname, resolver) {
  try {
    const { txt, status } = await resolveTxt(hostname, resolver);
    const tokens = txt.filter((record) => record.startsWith(TOKEN_PREFIX));
    const malformed = tokens.filter((record) => !TOKEN_SHAPE.test(record.slice(TOKEN_PREFIX.length)));
    return {
      hostname,
      verified: tokens.length > 0,
      resolves: status === 0,
      dnsStatus: DNS_STATUS[status] ?? String(status),
      token: tokens[0] === undefined ? null : tokens[0].slice(TOKEN_PREFIX.length),
      tokenCount: tokens.length,
      malformedTokens: malformed.length,
    };
  } catch (error) {
    return { hostname, verified: false, resolves: false, dnsStatus: null, token: null, tokenCount: 0, malformedTokens: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

function dnsRecord(hostname, token) {
  return { type: 'TXT', name: hostname, content: `${TOKEN_PREFIX}${token}`, ttl: 3600, proxied: false };
}

/**
 * Resolve the control-plane hostname to audit alongside the tenant apexes.
 *
 * @returns {string | null} Hostname, or `null` when the environment names no
 * public control plane (a local `localhost` `NEXT_PUBLIC_SITE_URL`, for example).
 */
function controlPlaneHost() {
  const declared = (process.env.DASHBOARD_HOST ?? '').trim().toLowerCase();
  if (declared !== '') return declared;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
  if (siteUrl === '') return null;
  try {
    const { hostname } = new URL(siteUrl);
    return /^(localhost|127\.0\.0\.1|\[::1\])$/u.test(hostname) ? null : hostname.toLowerCase();
  } catch {
    return null;
  }
}

const { tokens, rejected: rejectedTokens } = await readTokens(flags.get('tokens'));
const resolver = flags.get('resolver') === 'cloudflare' ? 'cloudflare' : 'google';

const apexes = await readApexes();
const extras = [...(repeated.get('host') ?? [])].filter((hostname) => hostname !== '');
if (extras.length === 0) {
  const fallback = controlPlaneHost();
  if (fallback !== null) extras.push(fallback);
}

const targets = [...new Set([...apexes, ...extras])];
const findings = await mapLimited(targets, concurrency, (hostname) => auditHostname(hostname, resolver));

const missing = findings.filter((finding) => !finding.verified);
const errors = findings.filter((finding) => finding.error !== undefined);
const unresolved = findings.filter((finding) => finding.resolves === false && finding.error === undefined);
const malformed = findings.filter((finding) => finding.malformedTokens > 0);
const withToken = missing.filter((finding) => tokens.has(finding.hostname));
const records = withToken.map((finding) => dnsRecord(finding.hostname, tokens.get(finding.hostname)));
const withoutToken = missing.filter((finding) => !tokens.has(finding.hostname));

if (asJson) {
  console.log(JSON.stringify({
    resolver,
    total: findings.length,
    apex: apexes.length,
    verified: findings.length - missing.length,
    missing: missing.length,
    errors: errors.length,
    unresolved: unresolved.length,
    malformed: malformed.length,
    findings,
    records,
    rejectedTokens,
    missingWithoutToken: withoutToken.map((finding) => finding.hostname),
  }, null, 2));
} else {
  console.log(`Search Console ownership audit (DoH resolver: ${resolver})`);
  console.log(`apex tenants: ${apexes.length}   audited hosts: ${findings.length}`);
  console.log(`verified: ${findings.length - missing.length}   missing: ${missing.length}   lookup errors: ${errors.length}   dns not resolving: ${unresolved.length}   malformed tokens: ${malformed.length}\n`);

  if (records.length > 0) {
    console.log(`== records to create (${records.length})`);
    for (const record of records) {
      console.log(`   ${record.type}  name=${record.name}  ttl=${record.ttl}`);
      console.log(`   ${record.content}`);
    }
    console.log('');
  }

  if (withoutToken.length > 0) {
    console.log(`== unverified, no token known (${withoutToken.length})`);
    console.log('   Add each domain in Search Console as a Domain property, then run again');
    console.log('   with --tokens=<file.json> to print the exact record to create.\n');
    for (const finding of withoutToken) console.log(`   - ${finding.hostname}${finding.error === undefined ? '' : ` [lookup error: ${finding.error}]`}`);
    console.log('');
  }

  if (unresolved.length > 0) {
    console.log(`== apex in the database that does not resolve (${unresolved.length})`);
    console.log('   A verification TXT cannot exist on a name with no zone. Fix DNS first.\n');
    for (const finding of unresolved) console.log(`   - ${finding.hostname} [${finding.dnsStatus}]`);
    console.log('');
  }

  if (malformed.length > 0) {
    console.log(`== unverified with a malformed token (${malformed.length})`);
    for (const finding of malformed) console.log(`   - ${finding.hostname}: ${finding.tokenCount} record(s), token failed shape check`);
    console.log('');
  }

  if (rejectedTokens.length > 0) {
    console.log(`== rejected --tokens entries (${rejectedTokens.length})`);
    console.log('   A Search Console token is 8-128 characters of A-Za-z0-9_-. No record\n   was emitted for these; re-copy the token from Search Console.\n');
    for (const entry of rejectedTokens) console.log(`   - ${entry.hostname}: ${JSON.stringify(entry.token)}`);
    console.log('');
  }
}

if (errors.length > 0) {
  console.error(`dns lookup failed for ${errors.length} host(s): ${errors.map((finding) => finding.hostname).join(', ')}`);
}

if (verifyOnly && (missing.length > 0 || errors.length > 0)) process.exit(1);
