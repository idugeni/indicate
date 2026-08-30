import { expect, test, type APIRequestContext, type BrowserContext } from '@playwright/test';

const ALPHA_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000001';
const BETA_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000002';
const ALPHA_ARTICLE_ID = '00000000-0000-4000-8000-000000000107';
const ALPHA_SITE_ID = '00000000-0000-4000-8000-000000000103';
const ALPHA_SECOND_SITE_ID = '00000000-0000-4000-8000-000000000108';

async function authenticate(context: BrowserContext) {
  await context.addCookies([{ name: 'indicate-stage2-session', value: 'stage2-valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax', secure: false }]);
}

async function command(request: APIRequestContext, organizationId: string, action: string, payload: unknown) {
  return request.post('/api/cms/stage4', { data: { organizationId, action, payload } });
}

test.beforeEach(async ({ context }) => authenticate(context));

test('authorizes, completes, lists, and tenant-isolates an exact-key media upload', async ({ page }) => {
  await page.goto('/cms');
  await page.getByRole('button', { name: 'Media', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Upload media' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Authorize and upload' })).toBeVisible();

  const reservedResponse = await command(page.request, ALPHA_ORGANIZATION_ID, 'media.reserve', {
    filename: '../Stage Four Lead.JPG', mediaType: 'image/jpeg', sizeBytes: 128,
    checksum: '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=', purpose: 'stage4-lead', owner: { kind: 'article', articleId: ALPHA_ARTICLE_ID },
  });
  expect(reservedResponse.status()).toBe(200);
  const reserved = await reservedResponse.json() as { reservationId: string; objectKey: string; authorization: { key: string } };
  expect(reserved.objectKey).toMatch(new RegExp(`^articles/${ALPHA_ARTICLE_ID}/`));
  expect(reserved.authorization.key).toBe(reserved.objectKey);

  expect((await command(page.request, ALPHA_ORGANIZATION_ID, 'media.test.accept-upload', { reservationId: reserved.reservationId })).status()).toBe(200);
  const completedResponse = await command(page.request, ALPHA_ORGANIZATION_ID, 'media.complete', { reservationId: reserved.reservationId });
  expect(completedResponse.status()).toBe(200);
  const completed = await completedResponse.json() as { id: string; state: string; objectKey: string };
  expect(completed).toMatchObject({ state: 'active', objectKey: reserved.objectKey });

  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Media', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: completed.id })).toBeVisible();

  const foreignRead = await command(page.request, BETA_ORGANIZATION_ID, 'media.read', { mediaId: completed.id });
  expect(foreignRead.status()).toBe(404);
  await expect(foreignRead.json()).resolves.toMatchObject({ error: { code: 'RESOURCE_UNAVAILABLE' } });
});

test('publishes to multiple Sites, retries partial failure, returns exact URLs, and hides foreign jobs', async ({ page }) => {
  const firstUrl = 'https://primary.0001.example.test/stage-four';
  const secondUrl = 'https://secondary.0001.example.test/stage-four';
  expect((await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.test.set-outcomes', {
    siteId: ALPHA_SITE_ID, outcomes: [{ kind: 'published', url: firstUrl }],
  })).status()).toBe(200);
  expect((await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.test.set-outcomes', {
    siteId: ALPHA_SECOND_SITE_ID, outcomes: [{ kind: 'retryable_failure', code: 'provider_temporarily_unavailable' }, { kind: 'published', url: secondUrl }],
  })).status()).toBe(200);

  await page.goto('/cms'); await page.getByRole('button', { name: 'Publishing', exact: true }).click();
  const form = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Publish to sites' }) });
  await form.getByRole('checkbox').nth(0).check(); await form.getByRole('checkbox').nth(1).check();
  await form.getByLabel('Idempotency key').fill(`stage4-e2e-${Date.now()}`);
  const acceptedResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/cms/stage4') && response.request().method() === 'POST');
  await form.getByRole('button', { name: 'Request publication' }).click();
  const acceptedResponse = await acceptedResponsePromise; expect(acceptedResponse.status()).toBe(200);
  const accepted = await acceptedResponse.json() as { job: { id: string } };

  expect((await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.test.run', {})).status()).toBe(200);
  let statusResponse = await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.status', { jobId: accepted.job.id });
  expect(statusResponse.status()).toBe(200);
  await expect(statusResponse.json()).resolves.toMatchObject({ job: { state: 'retrying' }, targets: expect.arrayContaining([expect.objectContaining({ siteId: ALPHA_SITE_ID, state: 'published', attempt: 1 }), expect.objectContaining({ siteId: ALPHA_SECOND_SITE_ID, state: 'retrying', attempt: 1 })]) });

  await page.waitForTimeout(1_100);
  expect((await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.test.reconcile', {})).status()).toBe(200);
  expect((await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.test.run', {})).status()).toBe(200);
  statusResponse = await command(page.request, ALPHA_ORGANIZATION_ID, 'publication.status', { jobId: accepted.job.id });
  expect(statusResponse.status()).toBe(200);
  const finalStatus = await statusResponse.json();
  expect(finalStatus).toMatchObject({
    job: { state: 'published' },
    result: { finalState: 'published', successfulCount: 2, urls: [firstUrl, secondUrl] },
    targets: expect.arrayContaining([expect.objectContaining({ siteId: ALPHA_SITE_ID, state: 'published', attempt: 1 }), expect.objectContaining({ siteId: ALPHA_SECOND_SITE_ID, state: 'published', attempt: 2 })]),
  });

  const foreignStatus = await command(page.request, BETA_ORGANIZATION_ID, 'publication.status', { jobId: accepted.job.id });
  expect(foreignStatus.status()).toBe(404);
  await expect(foreignStatus.json()).resolves.toMatchObject({ error: { code: 'RESOURCE_UNAVAILABLE' } });
});
