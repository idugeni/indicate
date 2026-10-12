-- Expand phase: provide the canonical global tag writer before application cutover.
--
-- This function is tenant-scoped and can coexist with the legacy article.tags
-- projection/trigger. The destructive column contraction is a separate migration
-- that must run only after the updated application is deployed.
--
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

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
        regexp_replace(regexp_replace(lower(trim(u.raw_tag)), '[^a-z0-9\s_-]', '', 'g'),
          '[\s_]+', '-', 'g'),
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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (283, 'article_tag_writer', 'sha256:45ebe1f7eba483682c45fed354ebc4267ef7b3b3ef96104aee267160ae2ada76');
