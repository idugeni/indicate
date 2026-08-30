import { createHmac } from 'node:crypto';
import { expect, test, type APIRequestContext, type BrowserContext } from '@playwright/test';

const ORG = '00000000-0000-4000-8000-000000000001';
const REGION = '00000000-0000-4000-8000-000000000102';
const SITE = '00000000-0000-4000-8000-000000000103';
const ARTICLE = '00000000-0000-4000-8000-000000000107';
const TELEGRAM_SECRET = 'stage1-client-secret-sentinel-webhook';
const GENERIC_SECRET = 'stage1-client-secret-sentinel-generic-webhook';
const CLOUDFLARE_ORIGIN_SECRET = 'stage1-client-secret-sentinel-cloudflare-origin';
const trustedEdgeHeaders = (host: 'api.indicate.web.id' | 'webhook.indicate.web.id', source = '127.0.0.1') => ({
  host,
  'x-indicate-cloudflare-origin': CLOUDFLARE_ORIGIN_SECRET,
  'cf-connecting-ip': source,
});

async function authenticate(context: BrowserContext) {
  await context.addCookies([{ name: 'indicate-stage2-session', value: 'stage2-valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax', secure: false }]);
}
async function cms(request: APIRequestContext, action: string, payload: unknown) {
  return request.post('/api/cms/stage6', { data: { organizationId: ORG, action, payload } });
}
async function telegram(request: APIRequestContext, updateId: number, message: Record<string, unknown>) {
  return request.post('/api/webhooks/telegram', { headers: { ...trustedEdgeHeaders('webhook.indicate.web.id'), 'x-telegram-bot-api-secret-token': TELEGRAM_SECRET }, data: { update_id: updateId, message: { date: Math.floor(Date.now() / 1_000), from: { id: 600001 }, chat: { id: 600002 }, ...message } } });
}

test.beforeEach(async ({ context }) => authenticate(context));

test('completes Telegram Article, image, Region, Site, publication, status, link, and duplicate flows', async ({ page }) => {
  expect((await telegram(page.request, 6101, { text: '/regions' })).status()).toBe(200);
  const steps = ['/article', REGION, 'Stage 6 E2E title', 'Stage 6 E2E body', 'Stage 6 E2E source', `stage6-e2e-${Date.now()}`];
  for (let index = 0; index < steps.length; index += 1) expect((await telegram(page.request, 6110 + index, { text: steps[index] })).status()).toBe(200);
  expect((await telegram(page.request, 6120, { text: `/sites ${ARTICLE}` })).status()).toBe(200);
  expect((await telegram(page.request, 6121, { text: SITE })).status()).toBe(200);
  expect((await telegram(page.request, 6130, { text: `/image ${ARTICLE}` })).status()).toBe(200);
  expect((await telegram(page.request, 6131, { document: { file_id: 'stage6-e2e-file', file_unique_id: 'stage6-unique', file_name: 'stage6.png', mime_type: 'image/png', file_size: 8 } })).status()).toBe(200);
  const publication = await telegram(page.request, 6140, { text: `/publish ${ARTICLE} ${SITE} stage6-e2e-publication` });
  expect(publication.status()).toBe(200); const publicationBody = await publication.json() as { result: { reply: string } };
  const jobId = publicationBody.result.reply.match(/[0-9a-f-]{36}/)?.[0]; expect(jobId).toBeTruthy();
  expect((await telegram(page.request, 6141, { text: `/status ${jobId}` })).status()).toBe(200);
  const links = await telegram(page.request, 6142, { text: `/links ${jobId}` }); expect(links.status()).toBe(200);
  const duplicate = await telegram(page.request, 6142, { text: `/links ${jobId}` }); expect(duplicate.status()).toBe(200); expect((await duplicate.json() as { result: unknown }).result).toEqual((await links.json() as { result: unknown }).result);
  expect((await telegram(page.request, 6199, { text: '/regions' })).status()).toBe(200);
  const invalid = await page.request.post('/api/webhooks/telegram', { headers: { ...trustedEdgeHeaders('webhook.indicate.web.id'), 'x-telegram-bot-api-secret-token': 'wrong' }, data: { update_id: 6200, message: { date: Math.floor(Date.now() / 1_000), from: { id: 600001 }, chat: { id: 600002 }, text: '/regions' } } });
  expect(invalid.status()).toBe(404);
});

test('shows one-time API credentials, rotates/revokes them, and invokes the stable API envelope', async ({ page }) => {
  await page.goto('/cms'); await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Issue API key' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Create Telegram mapping' })).toBeVisible();
  const issuedResponse = await cms(page.request, 'api-key.issue', { name: 'Stage 6 E2E key', scopes: ['article.manage'], expiresAt: null });
  expect(issuedResponse.status()).toBe(200); const issued = await issuedResponse.json() as { key: { id: string; version: number }; plaintext: string };
  expect(issued.plaintext).toMatch(/^ind_live_/);
  const invoke = (credential: string, slug: string) => page.request.post('/api/v1/commands', { headers: { ...trustedEdgeHeaders('api.indicate.web.id'), authorization: `Bearer ${credential}` }, data: { action: 'article.create', payload: { regionId: REGION, publisherId: null, categoryId: null, authorId: null, slug, title: 'API Stage 6', body: 'API body', source: 'API source', status: 'draft' } } });
  expect((await invoke(issued.plaintext, `api-stage6-${Date.now()}`)).status()).toBe(200);
  const rotatedResponse = await cms(page.request, 'api-key.rotate', { apiKeyId: issued.key.id, expectedVersion: issued.key.version });
  expect(rotatedResponse.status()).toBe(200); const rotated = await rotatedResponse.json() as { key: { id: string; version: number }; plaintext: string };
  expect((await invoke(issued.plaintext, `api-old-${Date.now()}`)).status()).toBe(404);
  expect((await invoke(rotated.plaintext, `api-new-${Date.now()}`)).status()).toBe(200);
  expect((await cms(page.request, 'api-key.revoke', { apiKeyId: rotated.key.id, expectedVersion: rotated.key.version })).status()).toBe(200);
  expect((await invoke(rotated.plaintext, `api-revoked-${Date.now()}`)).status()).toBe(404);
});

test('persists duplicate generic webhook outcome and authorizes platform customer administration only with a session', async ({ page, browser }) => {
  const raw = JSON.stringify({ event: 'stage6.e2e', value: 1 }); const timestamp = Math.floor(Date.now() / 1_000); const replayId = `stage6-${Date.now()}`;
  const signature = `sha256=${createHmac('sha256', GENERIC_SECRET).update(`${timestamp}.${raw}`).digest('hex')}`;
  const headers = { ...trustedEdgeHeaders('webhook.indicate.web.id'), 'content-type': 'application/json', 'x-indicate-webhook-source': 'generic', 'x-indicate-replay-id': replayId, 'x-indicate-timestamp': String(timestamp), 'x-indicate-signature': signature };
  const first = await page.request.fetch('/api/webhooks/generic', { method: 'POST', headers, data: raw }); const second = await page.request.fetch('/api/webhooks/generic', { method: 'POST', headers, data: raw });
  expect(first.status()).toBe(200); expect(second.status()).toBe(200); expect((await second.json() as { data: unknown }).data).toEqual((await first.json() as { data: unknown }).data);

  await page.goto('/cms'); await page.getByRole('button', { name: 'Customers', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Create Customer' })).toBeVisible();
  const customer = await cms(page.request, 'customer.create', { name: 'Stage 6 E2E Customer', slug: `stage6-e2e-${Date.now()}`, customerMetadata: {}, subscription: { plan: 'mvp', status: 'trialing', periodStartsAt: null, periodEndsAt: null } }); expect(customer.status()).toBe(200);
  const unauthorized = await browser.newContext();
  try { expect((await unauthorized.request.get(`/api/cms/stage6?organizationId=${ORG}&view=customers`)).status()).toBe(404); } finally { await unauthorized.close(); }
});

test('rejects alternate/default hosts and bounds unauthenticated API attempts before credential work', async ({ page }) => {
  const command = { action: 'article.create', payload: {} };
  const spoofedDefault = await page.request.post('/api/v1/commands', { headers: { 'x-indicate-cloudflare-origin': CLOUDFLARE_ORIGIN_SECRET, 'cf-connecting-ip': '198.51.100.80', authorization: 'Bearer invalid' }, data: command });
  expect(spoofedDefault.status()).toBe(404);
  const wrongProof = await page.request.post('/api/v1/commands', { headers: { ...trustedEdgeHeaders('api.indicate.web.id', '198.51.100.81'), 'x-indicate-cloudflare-origin': 'caller-spoof', authorization: 'Bearer invalid' }, data: command });
  expect(wrongProof.status()).toBe(404);
  const alternate = await page.request.post('/api/webhooks/telegram', { headers: { ...trustedEdgeHeaders('api.indicate.web.id', '198.51.100.82'), 'x-telegram-bot-api-secret-token': TELEGRAM_SECRET }, data: { update_id: 6990, message: { date: Math.floor(Date.now() / 1_000), from: { id: 600001 }, chat: { id: 600002 }, text: '/regions' } } });
  expect(alternate.status()).toBe(404);

  let response = await page.request.post('/api/v1/commands', { headers: { ...trustedEdgeHeaders('api.indicate.web.id', '198.51.100.90'), authorization: 'Bearer invalid' }, data: command });
  for (let index = 1; index <= 40 && response.status() !== 429; index += 1) response = await page.request.post('/api/v1/commands', { headers: { ...trustedEdgeHeaders('api.indicate.web.id', '198.51.100.90'), authorization: 'Bearer invalid' }, data: command });
  expect(response.status()).toBe(429);
  expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0);
});

test('replays rejected Telegram validation outcomes without invoking the workflow again', async ({ page }) => {
  expect((await telegram(page.request, 6210, { text: `/sites ${ARTICLE}` })).status()).toBe(200);
  const first = await telegram(page.request, 6211, { text: 'not-a-listed-site' });
  const duplicate = await telegram(page.request, 6211, { text: 'not-a-listed-site' });
  expect(first.status()).toBe(400); expect(duplicate.status()).toBe(400);
  await expect(duplicate.json()).resolves.toMatchObject({ error: { code: 'INVALID_INPUT' } });
  expect((await duplicate.json() as { error: unknown }).error).toEqual((await first.json() as { error: unknown }).error);
});

test('returns HTTP 429 with bounded retry guidance after the configured CMS mutation allowance', async ({ page }) => {
  let last = await cms(page.request, 'unknown.action', {});
  for (let index = 1; index <= 100 && last.status() !== 429; index += 1) last = await cms(page.request, 'unknown.action', {});
  expect(last.status()).toBe(429);
  expect(Number(last.headers()['retry-after'])).toBeGreaterThan(0);
  await expect(last.json()).resolves.toMatchObject({ error: { code: 'RATE_LIMITED' } });
});
