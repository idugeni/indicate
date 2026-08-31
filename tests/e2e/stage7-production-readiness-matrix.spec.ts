import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const environment = JSON.parse(
  readFileSync(new URL('../fixtures/stage1-runtime-environment.json', import.meta.url), 'utf8'),
) as { readonly MVP_ROOT_HOSTS: string };

const roots = environment.MVP_ROOT_HOSTS.split(',').map((value) => value.trim());
const regions = ['wonosobo', 'magelang', 'semarang'] as const;

test('serves the complete configuration-driven three-root by three-region public matrix with isolated branding, content, and SEO', async ({ request }) => {
  expect(roots).toHaveLength(3);
  expect(new Set(roots).size).toBe(3);
  for (const root of roots) {
    for (const region of regions) {
      const hostname = `${region}.${root}`;
      const homepage = await request.get('/', { headers: { Host: hostname } });
      expect(homepage.status(), hostname).toBe(200);
      const html = await homepage.text();
      expect(html).toContain(`Kabar ${region.charAt(0).toUpperCase()}${region.slice(1)} Hari Ini`);
      for (const other of regions.filter((candidate) => candidate !== region)) expect(html).not.toContain(`Kabar ${other.charAt(0).toUpperCase()}${other.slice(1)} Hari Ini`);
      expect(html).toContain(`https://${hostname}`);

      for (const path of ['/robots.txt', '/sitemap.xml', '/rss.xml']) {
        const response = await request.get(path, { headers: { Host: hostname } });
        expect(response.status(), `${hostname}${path}`).toBe(200);
        const body = await response.text();
        expect(body).toContain(`https://${hostname}`);
        for (const foreignRoot of roots.filter((candidate) => candidate !== root)) expect(body).not.toContain(foreignRoot);
      }
    }
  }
});

test('keeps all three apex Sites isolated and rejects near-match hostnames without fallback', async ({ request }) => {
  for (const root of roots) {
    const response = await request.get('/', { headers: { Host: root } });
    expect(response.status()).toBe(200);
    const body = await response.text();
    for (const foreignRoot of roots.filter((candidate) => candidate !== root)) expect(body).not.toContain(foreignRoot);
  }
  for (const hostname of [`prefix.${regions[0]}.${roots[0]}`, `not-${roots[1]}`, `${roots[2]}.suffix.invalid`]) {
    const response = await request.get('/', { headers: { Host: hostname } });
    expect(response.status()).toBe(404);
    const body = await response.text();
    for (const root of roots) expect(body).not.toContain(root);
  }
});
