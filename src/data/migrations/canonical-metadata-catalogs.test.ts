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


const taxonomyIntegrityMigration = readFileSync(
  join(process.cwd(), 'src', 'data', 'migrations', '20261012160000_global_taxonomy_integrity.sql'),
  'utf8',
);

describe('Global taxonomy binding integrity migration', () => {
  it('prevents random category catalog IDs and validates existing canonical bindings', () => {
    expect(taxonomyIntegrityMigration).toContain('ALTER TABLE public.categories ALTER COLUMN catalog_id DROP DEFAULT');
    expect(taxonomyIntegrityMigration).toContain('category_catalog_binding_inconsistent');
    expect(taxonomyIntegrityMigration).toContain('cc.slug <> c.slug OR cc.name <> c.name');
  });

  it('rechecks the canonical binding when a category catalog ID changes', () => {
    expect(taxonomyIntegrityMigration).toContain('BEFORE INSERT OR UPDATE OF name, slug, catalog_id ON public.categories');
    expect(taxonomyIntegrityMigration).toContain('EXECUTE FUNCTION indicate_private.sync_category_catalog_binding()');
  });
});


const globalMetadataReadersMigration = readFileSync(
  join(process.cwd(), 'src', 'data', 'migrations', '20261012170000_global_metadata_readers.sql'),
  'utf8',
);

describe('Canonical global metadata readers migration', () => {
  it('uses article_tags and tag_catalog instead of articles.tags', () => {
    expect(globalMetadataReadersMigration).toContain('public.article_tags AS at');
    expect(globalMetadataReadersMigration).toContain('public.tag_catalog AS tc');
    expect(globalMetadataReadersMigration).not.toMatch(/a\\.tags/);
  });

  it('resolves category display names through category_catalog', () => {
    expect(globalMetadataReadersMigration).toContain('public.category_catalog AS cc');
    expect(globalMetadataReadersMigration).toContain('ARRAY_AGG(cc.name ORDER BY ac.position)');
    expect(globalMetadataReadersMigration).toContain('cc.slug, cc.name');
  });
});
