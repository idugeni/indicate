-- Contract legacy article-level taxonomy projections after canonical writers/readers are deployed.
-- This migration intentionally removes only articles.category_id and articles.tags.
-- public.categories and article_categories.category_id remain tenant-scoped bindings.

DO $article_taxonomy_contraction$
DECLARE
  v_category_mismatches bigint;
  v_tag_mismatches bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'category_id'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'articles' AND column_name = 'tags'
  ) THEN
    RAISE EXCEPTION 'article_taxonomy_legacy_columns_missing';
  END IF;

  SELECT count(*) INTO v_category_mismatches
  FROM public.articles AS a
  WHERE a.category_id IS DISTINCT FROM (
    SELECT ac.category_id
    FROM public.article_categories AS ac
    WHERE ac.organization_id = a.organization_id AND ac.article_id = a.id
    ORDER BY ac.position
    LIMIT 1
  );

  SELECT count(*) INTO v_tag_mismatches
  FROM public.articles AS a
  WHERE a.tags IS DISTINCT FROM COALESCE((
    SELECT array_agg(tc.slug ORDER BY at.position)
    FROM public.article_tags AS at
    JOIN public.tag_catalog AS tc ON tc.id = at.tag_id AND tc.status = 'active'
    WHERE at.organization_id = a.organization_id AND at.article_id = a.id
  ), ARRAY[]::text[]);

  IF v_category_mismatches <> 0 OR v_tag_mismatches <> 0 THEN
    RAISE EXCEPTION 'article_taxonomy_legacy_projection_drift: category mismatches %, tag mismatches %',
      v_category_mismatches, v_tag_mismatches;
  END IF;

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
$article_taxonomy_contraction$;

DROP TRIGGER IF EXISTS articles_tag_catalog_sync ON public.articles;
DROP FUNCTION IF EXISTS indicate_private.sync_article_tag_catalog();

DROP INDEX IF EXISTS public.articles_organization_category_idx;
DROP INDEX IF EXISTS public.articles_tags_gin_idx;
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_category_fk;
ALTER TABLE public.articles
  DROP COLUMN category_id,
  DROP COLUMN tags;
