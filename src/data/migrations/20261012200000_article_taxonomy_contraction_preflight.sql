-- Preflight canonical taxonomy references before legacy contraction.
--
-- This migration is deliberately additive. It does not drop legacy columns,
-- triggers, constraints, or indexes: the destructive contraction must be a
-- separate later migration after the new application is deployed and verified.
-- These guards fail closed if canonical relations do not cover existing data.
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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (284, 'article_taxonomy_contraction_preflight', 'sha256:18296db334cfae888f90dc9f689095ad50718abd1a603fca0a46a8775c78f916');
