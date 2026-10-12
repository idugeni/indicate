-- Contract the legacy article taxonomy projection after all readers/writers moved.
--
-- article_categories.catalog_id and article_tags.tag_id are now the canonical
-- article-to-global-taxonomy relations. This migration refuses to contract until
-- every article's legacy tag/category data has a matching canonical relation.
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
CREATE FUNCTION indicate_private.replace_article_tags(
  p_organization_id uuid,
  p_article_id uuid,
  p_tags text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $func$
DECLARE
  v_tag text;
  v_position integer;
  v_tag_id uuid;
BEGIN
  IF p_organization_id IS DISTINCT FROM indicate_private.current_organization_id() THEN
    RAISE EXCEPTION 'article_tag_organization_mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.articles AS a
    WHERE a.organization_id = p_organization_id AND a.id = p_article_id
  ) THEN
    RAISE EXCEPTION 'article_tag_article_unavailable';
  END IF;

  DELETE FROM public.article_tags
  WHERE organization_id = p_organization_id AND article_id = p_article_id;

  FOR v_tag, v_position IN
    SELECT normalized.tag, min(u.ord)::integer
    FROM unnest(COALESCE(p_tags, ARRAY[]::text[])) WITH ORDINALITY AS u(raw_tag, ord)
    CROSS JOIN LATERAL (
      SELECT rtrim(left(trim(both '-' FROM regexp_replace(
        regexp_replace(regexp_replace(lower(trim(u.raw_tag)), '[^a-z0-9\\s_-]', '', 'g'),
          '[\\s_]+', '-', 'g'),
        '-+', '-', 'g')), 60), '-') AS tag
    ) AS normalized
    WHERE u.raw_tag ~ '[a-zA-Z0-9]' AND normalized.tag <> ''
    GROUP BY normalized.tag
    ORDER BY min(u.ord)
  LOOP
    INSERT INTO public.tag_catalog (name, slug, status)
    VALUES (v_tag, v_tag, 'active')
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO v_tag_id
    FROM public.tag_catalog
    WHERE slug = v_tag AND status = 'active';

    IF v_tag_id IS NULL THEN
      RAISE EXCEPTION 'tag_catalog_binding_unavailable';
    END IF;

    INSERT INTO public.article_tags (organization_id, article_id, tag_id, position)
    VALUES (p_organization_id, p_article_id, v_tag_id, v_position)
    ON CONFLICT (organization_id, article_id, tag_id)
    DO UPDATE SET position = EXCLUDED.position;
  END LOOP;
END
$func$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.replace_article_tags(uuid, uuid, text[]) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.replace_article_tags(uuid, uuid, text[]) TO indicate_runtime;--> statement-breakpoint
DROP TRIGGER articles_tag_catalog_sync ON public.articles;--> statement-breakpoint
DROP FUNCTION indicate_private.sync_article_tag_catalog();--> statement-breakpoint
DROP INDEX public.articles_tags_gin_idx;--> statement-breakpoint
DROP INDEX public.articles_organization_category_idx;--> statement-breakpoint
ALTER TABLE public.articles DROP CONSTRAINT articles_category_fk;--> statement-breakpoint
ALTER TABLE public.articles DROP COLUMN tags;--> statement-breakpoint
ALTER TABLE public.articles DROP COLUMN category_id;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (283, 'article_taxonomy_legacy_contraction', 'sha256:558457c59ef033a54eb49eb88fdd131767212bd2ac36d40fa78ea978b3b342c5');
