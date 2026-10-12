import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'src', 'data', 'migrations', '20261012000000_canonical_metadata_catalogs.sql'),
  'utf8',
);

describe('Canonical metadata catalog migration', () => {
  it('preserves tenant-owned category and region bindings while adding global identities', () => {
    expect(migration).toContain('CREATE TABLE public.category_catalog');
    expect(migration).toContain('ADD CONSTRAINT categories_catalog_fk');
    expect(migration).toContain('CREATE TABLE public.region_catalog');
    expect(migration).toContain('ADD CONSTRAINT regions_catalog_fk');
    expect(migration).toContain('regions_organization_catalog_unique');
    expect(migration).toContain('region_catalog_backfill_incomplete');
  });

  it('normalizes article tags into a global catalog and tenant-owned relation', () => {
    expect(migration).toContain('CREATE TABLE public.tag_catalog');
    expect(migration).toContain('CREATE TABLE public.article_tags');
    expect(migration).toContain('articles_tag_catalog_sync');
    expect(migration).toContain('AFTER INSERT OR UPDATE OF tags ON public.articles');
    expect(migration).toContain('FOREIGN KEY (organization_id, article_id) REFERENCES public.articles');
  });

  it('keeps the rollout additive and limits global catalog access to read-only runtime access', () => {
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN)\b/i);
    expect(migration).toContain('REVOKE ALL ON TABLE public.category_catalog, public.region_catalog, public.tag_catalog, public.article_tags');
    expect(migration).toContain('GRANT SELECT ON public.category_catalog, public.region_catalog, public.tag_catalog TO indicate_runtime');
    expect(migration).toContain('CREATE POLICY tenant_isolation_select ON public.article_tags');
  });
});
