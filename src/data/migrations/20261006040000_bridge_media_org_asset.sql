-- Izinkan aset organisasi yang dirujuk dalam otorisasi media bridge.
--
-- `authorize_bridge_media` (v268) hanya meloloskan purpose
-- `article-inline`/`article-cover`, sehingga logo penerbit
-- (`organization-asset`, dirujuk via `publishers.contacts.logoUrl`)
-- tetap 404 di portal penyaji. Semantik se-org (`authorizeSameOrgMedia`)
-- tidak memfilter purpose untuk rujukan logo penerbit, jadi paritasnya
-- adalah meloloskan ketiga purpose selama ada rujukan konten tayang.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
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
    AND m.purpose IN ('article-inline', 'article-cover', 'organization-asset')
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
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (269, 'bridge_media_org_asset', 'sha256:ae0e7723249e04a5eef3b300bd6213b319fd996dbeaa37a6e625d6537ac1eef9');
