import { expect, test, type BrowserContext } from '@playwright/test';

async function authenticate(context: BrowserContext) {
  await context.addCookies([{ name: 'indicate-stage2-session', value: 'stage2-valid', domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax', secure: false }]);
}

test.beforeEach(async ({ context }) => authenticate(context));

test('renders the protected responsive CMS shell and every Stage 3 area', async ({ page }) => {
  await page.goto('/cms');
  await expect(page.getByText('Indicate CMS')).toBeVisible();
  for (const label of ['Dashboard', 'Domains, regions & sites', 'Publishers', 'Articles', 'Analytics', 'Audit logs', 'Settings']) await expect(page.getByRole('button', { name: label })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Media (Stage 4)' })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.cms-content')).toBeVisible();
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true);
});

test('creates and lists a tenant Publisher through the shared Business Service', async ({ page }) => {
  await page.goto('/cms'); await page.getByRole('button', { name: 'Publishers', exact: true }).click();
  const publisherForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Create publisher' }) });
  await publisherForm.getByLabel('Name').fill('Wonosobo Community Desk');
  await publisherForm.getByLabel('Attribution').fill('Wonosobo Community');
  await publisherForm.getByLabel('Evidence reference').fill('evidence/community');
  await publisherForm.getByRole('button', { name: 'Create publisher' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Wonosobo Community Desk' })).toBeVisible();
});

test('creates canonical Article content and set-based Site assignment', async ({ page }) => {
  await page.goto('/cms'); await page.getByRole('button', { name: 'Articles', exact: true }).click();
  const articleForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Create canonical article' }) });
  await articleForm.getByLabel('Slug').fill('stage-three-article'); await articleForm.getByLabel('Title').fill('Stage Three Canonical Article');
  await articleForm.getByLabel('Source').fill('Editorial Desk'); await articleForm.getByLabel('Body').fill('One canonical body shared through assignments.');
  await articleForm.getByRole('button', { name: 'Create article' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Stage Three Canonical Article' })).toBeVisible();
  const assignmentForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Assign sites' }) });
  await assignmentForm.getByLabel('Article').selectOption({ label: 'Stage Three Canonical Article' });
  await assignmentForm.getByRole('checkbox').first().check(); await assignmentForm.getByRole('button', { name: 'Save assignments' }).click();
  await page.getByRole('button', { name: 'Audit logs' }).click();
  await expect(page.getByText('article.sites.assign')).toBeVisible();
});

test('verifies a Publisher, validates corrections, and creates a revocable official affiliation', async ({ page }) => {
  await page.goto('/cms'); await page.getByRole('button', { name: 'Publishers', exact: true }).click();
  const createForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Create publisher' }) });
  await createForm.getByLabel('Name').fill('E2E Verified Publisher'); await createForm.getByLabel('Attribution').fill('E2E Publisher'); await createForm.getByLabel('Evidence reference').fill('proof/e2e');
  await createForm.getByRole('button', { name: 'Create publisher' }).click();
  const decisionForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Publisher verification' }) });
  await decisionForm.getByLabel('Publisher').selectOption({ label: 'E2E Verified Publisher · unverified' }); await decisionForm.getByLabel('Decision').selectOption('publisher.submit'); await decisionForm.getByRole('button', { name: 'Apply publisher decision' }).click();
  await decisionForm.getByLabel('Publisher').selectOption({ label: 'E2E Verified Publisher · pending' }); await decisionForm.getByLabel('Decision').selectOption('publisher.reject'); await decisionForm.getByRole('button', { name: 'Apply publisher decision' }).click();
  await expect(page.locator('.cms-alert')).toContainText('reason');
  await decisionForm.getByLabel('Decision').selectOption('publisher.approve'); await decisionForm.getByRole('button', { name: 'Apply publisher decision' }).click();
  const affiliationForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Create official affiliation' }) });
  await affiliationForm.getByLabel('Verified publisher').selectOption({ label: 'E2E Verified Publisher' }); await affiliationForm.getByLabel('Institution name').fill('E2E Institution'); await affiliationForm.getByLabel('Claim scopes').fill('site_name'); await affiliationForm.getByLabel('Evidence reference').fill('proof/e2e-affiliation'); await affiliationForm.getByRole('button', { name: 'Create affiliation' }).click();
  const affiliationLifecycle = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Official affiliation lifecycle' }) });
  await expect(affiliationLifecycle.getByRole('option', { name: 'E2E Institution' })).toBeAttached();
});

test('forwards editorial and audit filters and returns correctable filter errors', async ({ page }) => {
  await page.goto('/cms'); await page.getByRole('button', { name: 'Articles', exact: true }).click();
  const filters = page.getByRole('form', { name: 'editorial filters' });
  await filters.getByLabel('Search').fill('canonical'); await filters.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Organization Alpha canonical article' })).toBeVisible();
  const invalid = await page.request.get('/api/cms/stage3?organizationId=00000000-0000-4000-8000-000000000001&view=editorial&publicationState=invalid');
  expect(invalid.status()).toBe(400); await expect(invalid.json()).resolves.toMatchObject({ error: { code: 'INVALID_INPUT', fields: { publicationState: expect.any(Array) } } });
  await page.getByRole('button', { name: 'Audit logs' }).click(); await expect(page.getByRole('form', { name: 'audit filters' })).toBeVisible();
  await page.getByRole('button', { name: 'Dashboard' }).click(); await expect(page.getByRole('heading', { name: 'Publishing jobs by state' })).toBeVisible();
});

test('switches organizations and reloads all tenant-scoped dashboard state', async ({ page }) => {
  await page.goto('/cms'); await expect(page.getByText('Alpha domain')).toBeVisible();
  await page.getByLabel('Switch organization').selectOption('00000000-0000-4000-8000-000000000002');
  await expect(page.getByText('Beta domain')).toBeVisible(); await expect(page.getByText('Alpha domain')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('generation 2');
});
