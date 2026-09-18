import { describe, expect, it } from 'vitest';

import { denied, deniedRobotsTxt } from '@/core/routing/deny';

describe('denied', () => {
  it('meneruskan status dan menandai no-store noindex', async () => {
    const response = denied(404);
    expect(response.status).toBe(404);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await response.text()).toBe('');
  });
});

describe('deniedRobotsTxt', () => {
  it('tetap berupa body robots valid dengan status teruskan', async () => {
    const response = deniedRobotsTxt(404);
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
    expect(await response.text()).toBe('User-agent: *\nDisallow: /\n');
  });
});
