-- Penugasan portal lintas-org: artikel milik org UPT tayang di portal operator.
--
-- Relasi `article_sites` dikunci satu-org oleh FK komposit dan RLS, dan
-- pelonggaran kunci itu akan menyentuh fondasi keamanan — ditolak. Tabel ini
-- adalah jembatan eksplisit sebagai gantinya: baris hidup di org PENYAJI
-- (operator) dengan FK same-org ke `sites`, menunjuk artikel kanonis di org
-- PEMILIK (UPT) lewat pasangan (source_organization_id, source_article_id)
-- yang SENGAJA tanpa FK, karena FK komposit tidak bisa menjangkau org lain.
-- Integritas pasangan dijamin berlapis: resolusi id→org di service (jalur
-- kreasi untuk-org), pemeriksaan tulis di worker, dan skrip higiene
-- berkala untuk yatim. RLS terkunci org penyaji; baca konten pemilik hanya
-- lewat `fetch_assigned_articles` yang memfilter eksplisit kedua parameter.
-- Checksum di bawah adalah sha256 heks dari isi berkas ini sebelum baris INSERT.
CREATE TABLE public.portal_assignments (
  organization_id uuid NOT NULL,
  id uuid NOT NULL,
  site_id uuid NOT NULL,
  source_organization_id uuid NOT NULL,
  source_article_id uuid NOT NULL,
  state publishing_state DEFAULT 'queued' NOT NULL,
  state_occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  published_at timestamp with time zone,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT portal_assignments_pk PRIMARY KEY (organization_id, id),
  CONSTRAINT portal_assignments_site_fk FOREIGN KEY (organization_id, site_id) REFERENCES public.sites(organization_id, id) ON DELETE RESTRICT,
  CONSTRAINT portal_assignments_owner_pair_unique UNIQUE (organization_id, source_organization_id, source_article_id, site_id),
  CONSTRAINT portal_assignments_published_needs_time CHECK ((state <> 'published') OR (published_at IS NOT NULL)),
  CONSTRAINT portal_assignments_version_positive CHECK (version > 0)
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS portal_assignments_id_unique ON public.portal_assignments (id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS portal_assignments_org_site_state_idx ON public.portal_assignments (organization_id, site_id, state);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS portal_assignments_org_source_idx ON public.portal_assignments (organization_id, source_organization_id, source_article_id);--> statement-breakpoint
ALTER TABLE public.portal_assignments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.portal_assignments FORCE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_select ON public.portal_assignments;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_insert ON public.portal_assignments;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_update ON public.portal_assignments;--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation_delete ON public.portal_assignments;--> statement-breakpoint
CREATE POLICY tenant_isolation_select ON public.portal_assignments FOR SELECT TO indicate_runtime USING (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
CREATE POLICY tenant_isolation_insert ON public.portal_assignments FOR INSERT TO indicate_runtime WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
CREATE POLICY tenant_isolation_update ON public.portal_assignments FOR UPDATE TO indicate_runtime USING (organization_id = indicate_private.current_organization_id()) WITH CHECK (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
CREATE POLICY tenant_isolation_delete ON public.portal_assignments FOR DELETE TO indicate_runtime USING (organization_id = indicate_private.current_organization_id());--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portal_assignments TO indicate_runtime;--> statement-breakpoint
CREATE OR REPLACE FUNCTION indicate_private.fetch_assigned_articles(
  requested_organization_id uuid,
  requested_article_ids uuid[]
)
RETURNS TABLE(
  article_id uuid, slug text, title text, excerpt text, canonical_url text,
  tags text[], status public.article_status, article_type text, is_sponsored boolean,
  video_url text, audio_url text, duration_seconds integer,
  region_id uuid, category_id uuid, publisher_id uuid, author_id uuid,
  lead_media_id uuid, cover_image_url text, published_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, indicate_private
AS $$
  SELECT a.id, a.slug, a.title, a.excerpt, a.canonical_url,
    a.tags, a.status, a.type::text, a.is_sponsored,
    a.video_url, a.audio_url, a.duration_seconds,
    a.region_id, a.category_id, a.publisher_id, a.author_id,
    a.lead_media_id, a.cover_image_url, a.published_at,
    a.updated_at
  FROM public.articles AS a
  WHERE a.organization_id = requested_organization_id
    AND a.id = ANY (requested_article_ids)
    AND a.status = 'active'
    AND a.published_at IS NOT NULL
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION indicate_private.fetch_assigned_articles(uuid, uuid[]) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION indicate_private.fetch_assigned_articles(uuid, uuid[]) TO indicate_runtime;--> statement-breakpoint
INSERT INTO public.indicate_schema_migrations(version, name, checksum)
VALUES (258, 'portal_assignments_bridge', 'sha256:044bad23c2df4724f908190e016a66ad4b254283b031346f441cc6e21c228beb');
