import { expect, test } from '@playwright/test';

test('fails closed for a non-control-plane host during the foundation stage', async ({ request }) => {
  const response = await request.get('/', { headers: { Host: 'unknown.example.web.id' } });
  expect(response.status()).toBe(404);
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
  expect(await response.text()).not.toContain('One secure foundation');
});

test('rejects malformed repeated Host values before application content', async ({ request }) => {
  const response = await request.get('/', { headers: { Host: 'indicate.web.id,evil.example' } });
  expect(response.status()).toBe(400);
  expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
});
