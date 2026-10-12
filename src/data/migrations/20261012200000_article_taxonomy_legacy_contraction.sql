-- Contract legacy article taxonomy columns after the updated application is deployed.
--
-- This migration is intentionally separate from the writer expansion. Apply only
-- after the deployed application uses article_categories/article_tags exclusively.
-- The guards fail closed if legacy data is not represented in canonical relations.
--
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

DO $article_taxonomy_contraction_guard$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.articles AS a
    WHERE a.category_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.article_categories AS ac
        WHERE ac.organization_id = a.organization_id
          AND ac.article_id = a.id
          AND ac.category_id = a.category_id
      )
  ) THEN
    RAISE EXCEPTION 'legacy_primary_category_not_migrated';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.articles AS a
    CROSS JOIN LATERAL unnest(COALESCE(a.tags, ARRAY[]::text[])) AS u(tag)
    WHERE u.tag <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.article_tags AS at
        JOIN public.tag_catalog AS tc ON tc.id = at.tag_id
        WHERE at.organization_id = a.organization_id
          AND at.article_id = a.id
          AND tc.slug = u.tag
      )
  ) THEN
    RAISE EXCEPTION 'legacy_article_tags_not_migrated';
  END IF;
END
$article_taxonomy_contraction_guard$;--> statement-breakpoint
DROP TRIGGER articles_tag_catalog_sync ON public.articles;--> statement-breakpoint
DROP FUNCTION indicate_private.sync_article_tag_catalog();--> statement-breakpoint
DROP INDEX public.articles_tags_gin_idx;--> statement-breakpoint
DROP INDEX public.articles_organization_category_idx;--> statement-breakpoint
ALTER TABLE public.articles DROP CONSTRAINT articles_category_fk;--> statement-breakpoint
ALTER TABLE public.articles DROP COLUMN tags;--> statement-breakpoint
ALTER TABLE public.articles DROP COLUMN category_id;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (284, 'article_taxonomy_legacy_contraction', 'sha256:a2b2487b92e95e80513f235aed99aa48bbcb5e95b4aab3d6db3eeac09df2b4eb');
