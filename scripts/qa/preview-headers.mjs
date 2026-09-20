import { createServer } from 'node:http';

const TENANT_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const PRIVATE_CACHE = 'private, no-store, max-age=0';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const [key, value] = process.argv[i].split('=');
  args.set(key, value ?? true);
}

const tenantBase = (args.get('--tenant') ?? process.env.TENANT_URL ?? process.env.PREVIEW_BASE_URL ?? '').toString().replace(/\/$/, '');
const dashboardBase = (args.get('--dashboard') ?? process.env.DASHBOARD_URL ?? process.env.PREVIEW_BASE_URL ?? '').toString().replace(/\/$/, '');
const sessionCookie = () => (process.env.PREVIEW_SESSION_COOKIE ?? '').toString();
const invoiceId = (process.env.PREVIEW_INVOICE_ID ?? '').toString();
const organizationId = (process.env.PREVIEW_ORGANIZATION_ID ?? '').toString();
const bypass = (process.env.PREVIEW_BYPASS ?? '').toString();

function baseHeaders(extra = {}) {
  const headers = { ...extra };
  if (sessionCookie() !== '') headers.cookie = sessionCookie();
  if (bypass !== '') headers['x-vercel-protection-bypass'] = bypass;
  return headers;
}

async function get(url, extra) {
  const started = performance.now();
  const response = await fetch(url, { headers: baseHeaders(extra), signal: AbortSignal.timeout(15000) });
  const body = Buffer.from(await response.arrayBuffer());
  return { status: response.status, cache: (response.headers.get('cache-control') ?? '').trim(), contentType: (response.headers.get('content-type') ?? '').trim(), body, ms: Math.round(performance.now() - started) };
}

function check(name, ok, detail = '') {
  return { name, ok, detail };
}

async function tenantChecks(base) {
  const res = await get(`${base}/`);
  return [
    check('tenant / status 200', res.status === 200, `status=${res.status}`),
    check('tenant / edge-cacheable', res.cache === TENANT_CACHE, `cache-control=${res.cache || '(hilang)'}`),
  ];
}

async function controlChecks(base) {
  const out = [];
  for (const path of ['/dashboard/billing', '/sign-in']) {
    const res = await get(`${base}${path}`);
    out.push(check(`${path} tidak di-cache edge`, res.cache === PRIVATE_CACHE, `status=${res.status} cache-control=${res.cache || '(hilang)'}`));
  }
  return out;
}

function sealUrl(base, type) {
  return `${base}/api/dashboard/billing/invoice/${encodeURIComponent(invoiceId)}/seal?type=${type}&organizationId=${encodeURIComponent(organizationId)}`;
}

async function sealChecks(base) {
  const out = [];
  const probe = await get(sealUrl(base, 'sign'));
  if (sessionCookie() === '') {
    out.push(check('seal tanpa sesi gagal tertutup', probe.status === 404 && !probe.contentType.startsWith('image/'), `status=${probe.status} content-type=${probe.contentType || '(hilang)'}`));
    out.push(check('seal tanpa sesi tidak bocor ke edge cache', probe.cache.includes('no-store'), `cache-control=${probe.cache || '(hilang)'}`));
    return out;
  }
  const sign = probe;
  const stamp = await get(sealUrl(base, 'stamp'));
  const isPng = (b) => b.length > 4 && b.subarray(0, 4).equals(PNG_MAGIC);
  out.push(check('seal sign 200 image tanpa edge-cache', sign.status === 200 && sign.contentType.startsWith('image/') && sign.cache.includes('no-store') && !sign.cache.includes('s-maxage'), `status=${sign.status} ${sign.contentType} ${sign.cache} ${sign.ms}ms ${sign.body.length}B`));
  out.push(check('seal stamp 200 PNG valid', stamp.status === 200 && stamp.contentType.startsWith('image/') && isPng(stamp.body), `status=${stamp.status} ${stamp.contentType} ${stamp.ms}ms ${stamp.body.length}B`));
  out.push(check('stamp mengeksekusi watermark (byte berbeda dari sign)', sign.body.length > 0 && stamp.body.length > 0 && !sign.body.equals(stamp.body), `sign=${sign.body.length}B stamp=${stamp.body.length}B`));
  return out;
}

function stub() {
  const signPng = Buffer.concat([PNG_MAGIC, Buffer.from('sign-bytes')]);
  const stampPng = Buffer.concat([PNG_MAGIC, Buffer.from('stamp-watermarked-bytes')]);
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub');
    if (url.pathname === '/') {
      res.writeHead(200, { 'Cache-Control': TENANT_CACHE, 'Content-Type': 'text/html' });
      res.end('<h1>tenant</h1>');
    } else if (url.pathname === '/dashboard/billing' || url.pathname === '/sign-in') {
      res.writeHead(200, { 'Cache-Control': PRIVATE_CACHE, 'Content-Type': 'text/html' });
      res.end('<h1>control</h1>');
    } else if (url.pathname.endsWith('/seal')) {
      if (req.headers.cookie === undefined || !req.headers.cookie.includes('sb-')) {
        res.writeHead(404, { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else if (url.searchParams.get('type') === 'stamp') {
        res.writeHead(200, { 'Cache-Control': 'private, no-store', 'Content-Type': 'image/png' });
        res.end(stampPng);
      } else {
        res.writeHead(200, { 'Cache-Control': 'private, no-store', 'Content-Type': 'image/png' });
        res.end(signPng);
      }
    } else {
      res.writeHead(404, { 'Cache-Control': PRIVATE_CACHE });
      res.end('Not Found');
    }
  });
}

async function safe(label, task) {
  try {
    return await task();
  } catch (error) {
    return [check(label, false, error instanceof Error ? error.message : String(error))];
  }
}

async function runSuite(tenant, dashboard) {
  return [
    ...(await safe('tenant / terjangkau', () => tenantChecks(tenant))),
    ...(await safe('control surface terjangkau', () => controlChecks(dashboard))),
    ...(await safe('seal terjangkau', () => sealChecks(dashboard))),
  ];
}

if (args.get('--self-test') === true) {
  const server = stub();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let failed = 0;
  for (const authed of [false, true]) {
    if (authed) process.env.PREVIEW_SESSION_COOKIE = 'sb-access-token=x';
    const results = await runSuite(base, base);    for (const r of results) {
      process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'} [${authed ? 'auth' : 'anon'}]: ${r.name}${r.detail === '' ? '' : ` (${r.detail})`}\n`);
      if (!r.ok) failed += 1;
    }
  }
  delete process.env.PREVIEW_SESSION_COOKIE;
  server.close();
  process.exit(failed === 0 ? 0 : 1);
}

if (tenantBase === '' || dashboardBase === '') {
  process.stderr.write('Penggunaan: TENANT_URL=... DASHBOARD_URL=... node scripts/qa/preview-headers.mjs [--self-test]\n');
  process.exit(2);
}

if (sessionCookie() !== '' && (invoiceId === '' || organizationId === '')) {
  process.stderr.write('PREVIEW_SESSION_COOKIE disetel tetapi PREVIEW_INVOICE_ID / PREVIEW_ORGANIZATION_ID kosong.\n');
  process.exit(2);
}

const results = await runSuite(tenantBase, dashboardBase);
let failed = 0;
for (const r of results) {
  process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}${r.detail === '' ? '' : ` (${r.detail})`}\n`);
  if (!r.ok) failed += 1;
}
if (sessionCookie() === '') process.stdout.write('INFO: tanpa PREVIEW_SESSION_COOKIE, seal hanya diuji pada jalur anonim fail-closed.\n');
process.exit(failed === 0 ? 0 : 1);
