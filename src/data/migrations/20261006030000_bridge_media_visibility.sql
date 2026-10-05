-- Visibilitas media milik org pemilik di portal penyaji bridge.
--
-- Tiga permukaan gambar artikel bridge 404: sampul lead milik org pemilik
-- tidak dikenal `authorizePublicMedia` (terikat org penyaji), inline
-- `article-inline` hanya lolos bila dirujuk artikel se-org, dan
-- `fetch_assigned_article_details` tidak mengekspos `lead_media_id`
-- sehingga halaman detail bridge tidak bisa merender sampul sama sekali.
--
-- Perubahan: (1) tambah kolom `lead_media_id` di reader bridge (dipakai
-- delivery untuk URL sampul + otorisasi media), (2) fungsi baru
-- `authorize_bridge_media` yang mengembalikan baris media aktif bila ada
-- assignment terbit di portal penyaji dan artikel pemilik yang tayang
-- merujuk media itu (lead, body, cover, logo penerbit, avatar penulis).
-- Rujukan adalah gerbangnya, sama seperti semantik se-org: media yang
-- tidak dirujuk konten tayang tetap tidak terlihat lintas-org.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
DROP FUNCTION IF EXISTS indicate_private.fetch_assigned_article_details(uuid, uuid[]);--> statement-breakpoint
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
  updated_at timestamp with time zone, body text, body_json jsonb,
  lead_media_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, a.canonical_url,
    a.tags, a.status, a.type::text, a.is_sponsored,
    a.video_url, a.audio_url, a.duration_seconds,
    a.region_id, c.slug, c.name,
    p.name, p.attribution_label,
    p.contacts->>'logoUrl', p.contacts->>'city', p.contacts->>'bio',
    p.verification_status = 'verified', p.type::text,
    au.display_name, au.bio, au.avatar_url, au.website_url,
    a.cover_image_url, a.published_at,
    a.updated_at, a.body, a.body_json,
    a.lead_media_id
  FROM public.articles AS a
  LEFT JOIN public.publishers AS p
    ON p.organization_id = a.organization_id AND p.id = a.publisher_id AND p.status = 'active'
  LEFT JOIN public.authors AS au
    ON au.organization_id = a.organization_id AND au.id = a.author_id AND au.status = 'active'
  LEFT JOIN public.categories AS c
    ON c.organization_id = a.organization_id AND c.id = a.category_id AND c.status = 'active'
  WHERE a.organization_id = requested_organization_id
    AND a.id = ANY (requested_article_ids)
    AND a.status = 'active'
    AND a.published_at IS NOT NULL
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fetch_assigned_article_details(uuid, uuid[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fetch_assigned_article_details(uuid, uuid[]) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.authorize_bridge_media(
  p_organization_id uuid,
  p_site_id uuid,
  p_media_id uuid
)
RETURNS SETOF public.media
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT m.* FROM public.media AS m
  WHERE m.id = p_media_id
    AND m.state = 'active'
    AND m.media_type LIKE 'image/%'
    AND m.purpose IN ('article-inline', 'article-cover')
    AND EXISTS (
      SELECT 1 FROM public.portal_assignments AS pa
      WHERE pa.organization_id = p_organization_id
        AND pa.site_id = p_site_id
        AND pa.state = 'published'
        AND pa.published_at IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.articles AS a
          LEFT JOIN public.publishers AS p
            ON p.organization_id = a.organization_id AND p.id = a.publisher_id AND p.status = 'active'
          LEFT JOIN public.authors AS au
            ON au.organization_id = a.organization_id AND au.id = a.author_id AND au.status = 'active'
          WHERE a.organization_id = pa.source_organization_id
            AND a.id = pa.source_article_id
            AND a.status = 'active'
            AND a.published_at IS NOT NULL
            AND (
              a.lead_media_id = m.id
              OR a.cover_image_url LIKE '%/' || m.id::text || '%'
              OR a.body LIKE '%/api/network/media/' || m.id::text || '%'
              OR a.body LIKE '%media:' || m.id::text || '%'
              OR a.body_json::text LIKE '%/api/network/media/' || m.id::text || '%'
              OR a.body_json::text LIKE '%media:' || m.id::text || '%'
              OR p.contacts->>'logoUrl' LIKE '%/' || m.id::text || '%'
              OR au.avatar_url LIKE '%/' || m.id::text || '%'
            )
        )
    )
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.authorize_bridge_media(uuid, uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.authorize_bridge_media(uuid, uuid, uuid) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (268, 'bridge_media_visibility', 'sha256:655ff02e7f787e86a57a393aa19c9dd0af99943ddda6ecc1049025e13bce86f5');
