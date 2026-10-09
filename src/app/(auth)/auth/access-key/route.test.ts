import { describe, expect, it } from 'vitest';

import { ALL_VIEWS } from '@/modules/dashboard/components/view-registry';

import { createAccessKeyRedirect } from './route';
import { resolveAccessKeyDestination } from './route-helpers';

describe('resolveAccessKeyDestination', () => {
  it('mendarat di ruang tulis tanpa parameter', () => {
    expect(resolveAccessKeyDestination(null)).toBe('/dashboard?view=editorial');
  });

  it('menghormati view allowlist dan menolak redirect luar', () => {
    expect(resolveAccessKeyDestination('articles')).toBe('/dashboard?view=articles');
    expect(resolveAccessKeyDestination('published')).toBe('/dashboard?view=published');
    expect(resolveAccessKeyDestination('https://evil.test')).toBe('/dashboard?view=editorial');
    expect(resolveAccessKeyDestination('//evil.test/x')).toBe('/dashboard?view=editorial');
    expect(resolveAccessKeyDestination('')).toBe('/dashboard?view=editorial');
    expect(resolveAccessKeyDestination('ruh-masuk')).toBe('/dashboard?view=editorial');
  });

  it('allowlist sejajar dengan view registry', () => {
    for (const view of ALL_VIEWS) {
      expect(resolveAccessKeyDestination(view)).toBe(`/dashboard?view=${view}`);
    }
  });
});

describe('createAccessKeyRedirect', () => {
  it('prevents caching and referrer forwarding on every redemption redirect', () => {
    const response = createAccessKeyRedirect(new URL('https://indicate.website/dashboard?view=editorial'));

    expect(response.status).toBe(303);
    expect(response.headers.get('cache-control')).toBe('no-store, max-age=0');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });
});
