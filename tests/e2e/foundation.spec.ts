import { expect, test } from '@playwright/test';

test('renders the non-indexable shared foundation without tenant data', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Indicate Control Plane');
  await expect(page.getByRole('heading', { name: 'One secure foundation for every Indicate publication.' })).toBeVisible();
  await expect(page.getByText('Cloudflare DNS, TLS proxy, and CDN')).toBeVisible();
  await expect(page.getByText('One Vercel project with exact domains only')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('[data-stage="foundation"]')).toBeVisible();
  await expect(page.getByText(/tenant data services are intentionally unavailable/i)).toBeVisible();
});

test('returns a minimal no-store health response without secrets', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBe(true);
  expect(response.headers()['cache-control']).toBe('no-store');
  const body = await response.json();
  expect(body).toEqual({
    service: 'indicate',
    stage: 'foundation',
    status: 'ok',
    configuration: 'valid',
    environment: 'test',
  });
  expect(JSON.stringify(body)).not.toMatch(/token|secret|database|organization/i);
});
