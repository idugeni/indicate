-- Visibilitas bridge untuk dasbor org pemilik.
--
-- `readEditorialScope` per-org memfilter `a.organization_id = :org` dan
-- agregat tayangnya hanya membaca `article_sites` milik sendiri, sehingga
-- artikel pemilik (mis. RUTAN) yang terbit murni via `portal_assignments`
-- di org penyaji tak pernah lolos filter `publicationState` dasbornya
-- sendiri dan URL tayangnya tak punya sumber. Tiga pembaca SECURITY DEFINER
-- di bawah menutupnya tanpa menyentuh RLS: hanya baris bridge milik
-- pasangan (org pemilik, artikel) yang dikembalikan, tanpa body/PII.
-- Otorisasi (membership `article.read`, kunci region) tetap di lapisan
-- aplikasi sebelum dipanggil.
--
-- Body digest (reproducible): LF-normalize this file, substitute the 64-hex
-- checksum literal below with 64 zeros, SHA-256 the complete UTF-8 bytes.
CREATE OR REPLACE FUNCTION indicate_private.bridge_article_ids(
  p_owner_organization_id uuid,
  p_state text
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT COALESCE(ARRAY_AGG(DISTINCT pa.source_article_id), '{}'::uuid[])
  FROM public.portal_assignments AS pa
  WHERE pa.source_organization_id = p_owner_organization_id
    AND (p_state IS NULL OR p_state = '' OR pa.state::text = p_state)
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.bridge_article_ids(uuid, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.bridge_article_ids(uuid, text) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.list_own_bridge_urls(
  p_owner_organization_id uuid,
  p_article_ids uuid[]
)
RETURNS TABLE(
  source_article_id uuid,
  url text,
  published_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT pa.source_article_id AS source_article_id,
    ('https://' || st.normalized_hostname || '/' || a.slug)::text AS url,
    pa.published_at AS published_at
  FROM public.portal_assignments AS pa
  JOIN public.sites AS st ON st.organization_id = pa.organization_id AND st.id = pa.site_id
  JOIN public.articles AS a ON a.organization_id = pa.source_organization_id AND a.id = pa.source_article_id
  WHERE pa.source_organization_id = p_owner_organization_id
    AND pa.source_article_id = ANY (p_article_ids)
    AND pa.state = 'published'
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_own_bridge_urls(uuid, uuid[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_own_bridge_urls(uuid, uuid[]) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.bridge_published_count(
  p_owner_organization_id uuid,
  p_source_article_id uuid
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT COUNT(*)::bigint
  FROM public.portal_assignments AS pa
  WHERE pa.source_organization_id = p_owner_organization_id
    AND pa.source_article_id = p_source_article_id
    AND pa.state = 'published'
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.bridge_published_count(uuid, uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.bridge_published_count(uuid, uuid) TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.list_bridge_serving_targets(
  p_owner_organization_id uuid,
  p_article_ids uuid[]
)
RETURNS TABLE(
  serving_organization_id uuid,
  site_id uuid,
  hostname text,
  source_article_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT pa.organization_id AS serving_organization_id,
    pa.site_id AS site_id,
    st.normalized_hostname AS hostname,
    pa.source_article_id AS source_article_id
  FROM public.portal_assignments AS pa
  JOIN public.sites AS st ON st.organization_id = pa.organization_id AND st.id = pa.site_id
  WHERE pa.source_organization_id = p_owner_organization_id
    AND pa.source_article_id = ANY (p_article_ids)
    AND pa.state = 'published'
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.list_bridge_serving_targets(uuid, uuid[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.list_bridge_serving_targets(uuid, uuid[]) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (275, 'own_bridge_reads', 'sha256:2ae7ed596ef17683659955fe4c14ea1ca10d131bb7b77ebf1b897913415d80c9');
