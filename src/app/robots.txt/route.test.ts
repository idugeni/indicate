import { describe, expect, it } from 'vitest';

import { controlPlaneRobots } from '@/app/robots.txt/route';

describe('controlPlaneRobots', () => {
  it('mengizinkan layanan publik dan menolak permukaan mesin', () => {
    const body = controlPlaneRobots('indicate.web.id');
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /$');
    expect(body).toContain('Disallow: /dashboard');
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Sitemap: https://indicate.web.id/sitemap.xml');
  });
});
