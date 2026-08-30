import { expect, test } from '@playwright/test';

test('denies an unauthenticated CMS request before organization data loads', async ({ page }) => {
  await page.goto('/cms');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign in to Indicate' })).toBeVisible();
  await expect(page.getByText('Alpha domain')).toHaveCount(0);
});

test('switches Active Organization and discards prior tenant records', async ({ context, page }) => {
  await context.addCookies([{
    name: 'indicate-stage2-session', value: 'stage2-valid',
    domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax', secure: false,
  }]);
  await page.goto('/cms');
  await expect(page.getByText('Signed in as Stage 2 Test Editor')).toBeVisible();
  await expect(page.getByText('Alpha domain')).toBeVisible();
  await page.getByLabel('Switch organization').selectOption('00000000-0000-4000-8000-000000000002');
  await expect(page.getByText('Beta domain')).toBeVisible();
  await expect(page.getByText('Alpha domain')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('generation 2');
});

test('uses a non-disclosing denial and preserves the current tenant on unauthorized switching', async ({ context, page }) => {
  await context.addCookies([{
    name: 'indicate-stage2-session', value: 'stage2-valid',
    domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Lax', secure: false,
  }]);
  await page.goto('/cms');
  await page.getByLabel('Switch organization').selectOption('foreign-organization');
  await expect(page.getByText('The requested resource is unavailable.', { exact: true })).toBeVisible();
  await expect(page.getByText('Alpha domain')).toBeVisible();
  await expect(page.getByText(/foreign organization data/i)).toHaveCount(0);
});
