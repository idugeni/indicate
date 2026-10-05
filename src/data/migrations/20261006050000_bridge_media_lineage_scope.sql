-- Otorisasi media bridge mengikuti visibilitas listing portal.
--
-- `authorize_bridge_media` (v268-269) mensyaratkan assignment tepat di
-- portal peminta, sementara listing bridge (sejak perbaikan visibility)
-- adalah gabungan leluhur + turunan. Akibatnya sampul/logo/avarat
-- artikel bridge 404 di apex/region padahal artikelnya tampil di sana.
-- Syarat site dilonggarkan menjadi satu garis keturunan dengan portal
-- peminta (diri + leluhur + turunan, kedalaman <= 3): tepat himpunan
-- portal yang me-listing artikel tersebut. Gerbang rujukan tidak berubah.
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
        AND pa.site_id IN (
          WITH RECURSIVE up AS (
            SELECT s.id, s.parent_site_id FROM sites s
            WHERE s.organization_id = p_organization_id AND s.id = p_site_id
            UNION ALL
            SELECT p.id, p.parent_site_id FROM sites p
            JOIN up c ON p.id = c.parent_site_id
            WHERE p.organization_id = p_organization_id
          ),
          down AS (
            SELECT s.id FROM sites s
            WHERE s.organization_id = p_organization_id AND s.id = p_site_id
            UNION ALL
            SELECT c.id FROM sites c
            JOIN down par ON c.parent_site_id = par.id
            WHERE c.organization_id = p_organization_id
          )
          SELECT id FROM up UNION SELECT id FROM down
        )
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
VALUES (270, 'bridge_media_lineage_scope', 'sha256:81509b78c4650d01865288ee01079d629c6878141c2020611558cd2eaf650dcb');
