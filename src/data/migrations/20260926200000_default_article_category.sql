-- Seed the default article category for every organization that can publish.
--
-- `articles.category_id` was nullable and the article composer let the field
-- stay empty, so an article could be filed under no category at all. Every
-- consumer degrades on that: the article page drops the category chip and the
-- breadcrumb segment, the nav and the author profile build their category
-- lists from `categorySlug IS NOT NULL` so the article is unreachable from
-- any category page, and the NewsArticle JSON-LD, the OpenGraph `section`, and
-- the RSS `<category>` element are all omitted. An article nobody can browse
-- to and whose structured data is missing is the worst possible filing, and it
-- happened silently.
--
-- The default is `Umum` (slug `umum`). "Lainnya" would have been the obvious
-- alternative, but a fallback that reads as a rubbish bin is one editors start
-- ignoring; `Umum` is the neutral filing label Indonesian newsrooms actually
-- use for material that does not belong to a specific desk.
--
-- The row is seeded per organization rather than globally because categories
-- are tenant data (`categories.organization_id`). Sixty of the sixty-one
-- organizations had no category row at all, so scoping the seed to
-- organizations that own a publisher is what makes a tenant able to file an
-- article at all; `Drill Expire` owns no publisher and gets no category.
--
-- `TenantBusinessService` resolves this slug before writing, so an article can
-- no longer be stored without a category even when an API caller omits the
-- field, and the composer pre-selects it so the choice is visible rather than
-- silent.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
INSERT INTO public.categories (organization_id, id, name, slug, status, version, created_at, updated_at)
SELECT publisher_org.organization_id,
       gen_random_uuid(),
       'Umum',
       'umum',
       'active'::public.record_status,
       1,
       now(),
       now()
  FROM (SELECT DISTINCT organization_id FROM public.publishers) AS publisher_org
  LEFT JOIN public.categories AS existing
    ON existing.organization_id = publisher_org.organization_id
   AND existing.slug = 'umum'
 WHERE existing.id IS NULL;--> statement-breakpoint
DO $$
DECLARE
  seeded integer;
  expected integer;
  missing integer;
BEGIN
  SELECT count(*) INTO expected
    FROM (SELECT DISTINCT organization_id FROM public.publishers) AS publisher_org;

  SELECT count(*) INTO seeded
    FROM public.categories
   WHERE slug = 'umum'
     AND status = 'active'
     AND EXISTS (SELECT 1 FROM public.publishers AS p WHERE p.organization_id = categories.organization_id);

  SELECT count(*) INTO missing
    FROM (SELECT DISTINCT organization_id FROM public.publishers) AS publisher_org
   WHERE NOT EXISTS (
     SELECT 1 FROM public.categories AS c
      WHERE c.organization_id = publisher_org.organization_id
        AND c.slug = 'umum'
        AND c.status = 'active'
   );

  IF missing <> 0 THEN
    RAISE EXCEPTION 'default_article_category_missing: % publishing organizations have no active umum category', missing;
  END IF;

  RAISE NOTICE 'default_article_category_done: % seeded, % publishing organizations', seeded, expected;
END;
$$;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (206, 'default_article_category', 'sha256:1b33e87699190df9803a5701d9a5b4288e6ec131bb01e9d80396be7616db0846');
