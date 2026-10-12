-- Read syndicated article taxonomy exclusively from the canonical global catalogs.
-- This replaces the pre-contraction reader that referenced articles.category_id and
-- articles.tags, both of which were removed by drop_legacy_article_taxonomy.
-- Missing categories remain null at the data layer; the UI has one shared "Berita"
-- presentation fallback and does not invent a category catalog row.
-- Body digest: LF-normalize this file and replace its own checksum with zeros.

CREATE OR REPLACE FUNCTION indicate_private.fetch_assigned_article_details(
  requested_organization_id uuid,
  requested_article_ids uuid[]
)
RETURNS TABLE(
  article_id uuid, slug text, title text, excerpt text, canonical_url text,
  tags text[], status public.article_status, article_type text, is_sponsored boolean,
  video_url text, audio_url text, duration_seconds integer,
  region_id uuid, category_slug text, category_name text,
  publisher_name text, attribution text, publisher_logo text, publisher_city text,
  publisher_bio text, publisher_verified boolean, publisher_type text,
  author_display text, author_bio text, author_avatar text, author_url text,
  cover_image_url text, published_at timestamp with time zone,
  updated_at timestamp with time zone, body text, body_json jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT
    a.id,
    a.slug,
    a.title,
    a.excerpt,
    a.canonical_url,
    COALESCE((
      SELECT array_agg(tc.slug ORDER BY at.position)
      FROM public.article_tags AS at
      JOIN public.tag_catalog AS tc
        ON tc.id = at.tag_id AND tc.status = 'active'
      WHERE at.organization_id = a.organization_id
        AND at.article_id = a.id
    ), ARRAY[]::text[]),
    a.status,
    a.type::text,
    a.is_sponsored,
    a.video_url,
    a.audio_url,
    a.duration_seconds,
    a.region_id,
    (
      SELECT cc.slug
      FROM public.article_categories AS ac
      JOIN public.category_catalog AS cc
        ON cc.id = ac.catalog_id AND cc.status = 'active'
      WHERE ac.organization_id = a.organization_id
        AND ac.article_id = a.id
      ORDER BY ac.position, cc.slug
      LIMIT 1
    ),
    (
      SELECT cc.name
      FROM public.article_categories AS ac
      JOIN public.category_catalog AS cc
        ON cc.id = ac.catalog_id AND cc.status = 'active'
      WHERE ac.organization_id = a.organization_id
        AND ac.article_id = a.id
      ORDER BY ac.position, cc.slug
      LIMIT 1
    ),
    p.name,
    p.attribution_label,
    p.contacts->>'logoUrl',
    p.contacts->>'city',
    p.contacts->>'bio',
    p.verification_status = 'verified',
    p.type::text,
    au.display_name,
    au.bio,
    au.avatar_url,
    au.website_url,
    a.cover_image_url,
    a.published_at,
    a.updated_at,
    a.body,
    a.body_json
  FROM public.articles AS a
  LEFT JOIN public.publishers AS p
    ON p.organization_id = a.organization_id
   AND p.id = a.publisher_id
   AND p.status = 'active'
  LEFT JOIN public.authors AS au
    ON au.organization_id = a.organization_id
   AND au.id = a.author_id
   AND au.status = 'active'
  WHERE a.organization_id = requested_organization_id
    AND a.id = ANY (requested_article_ids)
    AND a.status = 'active'
    AND a.published_at IS NOT NULL
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fetch_assigned_article_details(uuid, uuid[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fetch_assigned_article_details(uuid, uuid[]) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (286, 'global_category_delivery', 'sha256:ca1dd9339d03512356bb840d3ecc0006dbbcb376d7630a45b4f88c5de10ff9ce');
