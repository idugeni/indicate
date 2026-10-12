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
    FROM public.article_categories AS ac
    LEFT JOIN public.category_catalog AS cc ON cc.id = ac.catalog_id
    WHERE cc.id IS NULL
  ) THEN
    RAISE EXCEPTION 'article_category_global_reference_missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.article_tags AS at
    LEFT JOIN public.tag_catalog AS tc ON tc.id = at.tag_id
    WHERE tc.id IS NULL
  ) THEN
    RAISE EXCEPTION 'article_tag_global_reference_missing';
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
VALUES (284, 'article_taxonomy_legacy_contraction', 'sha256:245205083437411b577683c6da5b70a34d324543ab1cb01f9480319275fafc1d');
