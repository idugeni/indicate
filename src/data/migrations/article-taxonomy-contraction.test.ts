import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'src', 'data', 'migrations', '20261013000000_drop_legacy_article_taxonomy.sql'),
  'utf8',
);

describe('Legacy article taxonomy contraction migration', () => {
  it('fails closed when legacy projections drift from canonical category and tag relations', () => {
    expect(migration).toContain('article_taxonomy_legacy_projection_drift');
    expect(migration).toContain('article_category_global_reference_missing');
    expect(migration).toContain('article_tag_global_reference_missing');
  });

  it('removes only article-level compatibility columns and their obsolete tag sync dependency', () => {
    expect(migration).toContain('DROP TRIGGER IF EXISTS articles_tag_catalog_sync ON public.articles');
    expect(migration).toContain('DROP FUNCTION IF EXISTS indicate_private.sync_article_tag_catalog()');
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS articles_category_fk');
    expect(migration).toContain('DROP COLUMN category_id');
    expect(migration).toContain('DROP COLUMN tags');
    expect(migration).toContain("VALUES (285, 'drop_legacy_article_taxonomy'");
    expect(migration).not.toMatch(/DROP TABLE\s+(?:public\.)?(?:categories|article_categories|category_catalog|tag_catalog|article_tags)/i);
  });
});
