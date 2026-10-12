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
    expect(taxonomyIntegrityMigration).toContain('NEW.name := v_catalog_name');
    expect(taxonomyIntegrityMigration).toContain('NEW.slug := v_catalog_slug');
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
    expect(globalMetadataReadersMigration).not.toMatch(/a\.tags/);
    expect(globalMetadataReadersMigration).not.toMatch(/a\.category_id/);
  });

  it('resolves category display names through category_catalog', () => {
    expect(globalMetadataReadersMigration).toContain('public.category_catalog AS cc');
    expect(globalMetadataReadersMigration).toContain('ARRAY_AGG(cc.name ORDER BY ac.position)');
    expect(globalMetadataReadersMigration).toContain('cc.slug, cc.name');
  });
});


const articleCategoryGlobalIdentityMigration = readFileSync(
  join(process.cwd(), 'src', 'data', 'migrations', '20261012180000_article_category_global_identity.sql'),
  'utf8',
);

describe('Global article-category identity migration', () => {
  it('backfills article-category relations to global catalog IDs and prevents duplicate global assignments', () => {
    expect(articleCategoryGlobalIdentityMigration).toContain('SET catalog_id = c.catalog_id');
    expect(articleCategoryGlobalIdentityMigration).toContain('article_categories_global_category_unique');
    expect(articleCategoryGlobalIdentityMigration).toContain('duplicate_global_category_for_article');
  });

  it('keeps tenant category bindings compatible while enforcing catalog identity', () => {
    expect(articleCategoryGlobalIdentityMigration).toContain('article_categories_catalog_fk');
    expect(articleCategoryGlobalIdentityMigration).toContain('article_category_catalog_mismatch');
    expect(articleCategoryGlobalIdentityMigration).toContain('BEFORE INSERT OR UPDATE OF category_id, catalog_id ON public.article_categories');
  });
});


const articleTaxonomyContractionMigration = readFileSync(
  join(process.cwd(), 'src', 'data', 'migrations', '20261012190000_article_taxonomy_legacy_contraction.sql'),
  'utf8',
);

describe('Legacy article taxonomy contraction migration', () => {
  it('fails closed if legacy categories or tags are not represented canonically', () => {
    expect(articleTaxonomyContractionMigration).toContain('legacy_primary_category_not_migrated');
    expect(articleTaxonomyContractionMigration).toContain('legacy_article_tags_not_migrated');
  });

  it('replaces the legacy tag trigger with a tenant-checked canonical writer', () => {
    expect(articleTaxonomyContractionMigration).toContain('indicate_private.replace_article_tags');
    expect(articleTaxonomyContractionMigration).toContain('p_organization_id IS DISTINCT FROM indicate_private.current_organization_id()');
    expect(articleTaxonomyContractionMigration).toContain('DROP TRIGGER articles_tag_catalog_sync ON public.articles');
  });

  it('drops legacy article metadata only after canonical read/write paths exist', () => {
    expect(articleTaxonomyContractionMigration).toContain('ALTER TABLE public.articles DROP COLUMN tags');
    expect(articleTaxonomyContractionMigration).toContain('ALTER TABLE public.articles DROP COLUMN category_id');
    expect(articleTaxonomyContractionMigration).toContain('DROP FUNCTION indicate_private.sync_article_tag_catalog()');
  });
});
